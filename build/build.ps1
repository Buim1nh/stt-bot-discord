# Đóng gói bản phát hành cho Windows:
#   dist\STTBot\                     thư mục chạy được (node.exe, uv.exe, code, STTBot.exe)
#   dist\STTBot-portable-<ver>.zip   bản giải nén là dùng
#   dist\STTBot-Setup-<ver>.exe      bộ cài (cần Inno Setup 6)
# Chạy:  powershell -ExecutionPolicy Bypass -File build\build.ps1
param(
    [string]$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source,
    [string]$UvVersion = 'latest',
    [string]$WebView2Version = '1.0.2903.40',
    [switch]$SkipInstaller
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $root 'dist'
$out = Join-Path $dist 'STTBot'
$cache = Join-Path $PSScriptRoot 'cache'
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
Write-Host "== Đóng gói STT Bot $version =="

if (-not $NodeExe -or -not (Test-Path $NodeExe)) { throw 'Không thấy node.exe. Cài Node.js 22.12+ hoặc truyền -NodeExe <đường dẫn>.' }
$nodeVersion = & $NodeExe --version
if ([version]$nodeVersion.TrimStart('v') -lt [version]'22.12.0') { throw "Cần Node.js 22.12+, đang có $nodeVersion" }

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force $out, "$out\node", "$out\tools", "$out\config", "$out\stt", $cache | Out-Null

Write-Host '== Chép mã nguồn =='
Copy-Item "$root\src", "$root\prompts" $out -Recurse
Copy-Item "$root\stt\*.py", "$root\stt\requirements*.txt" "$out\stt"
Copy-Item "$root\config\*.example.*" "$out\config"
Copy-Item "$root\package.json", "$root\package-lock.json", "$root\.env.example", "$root\LICENSE", "$root\README.md" $out
if (Test-Path "$root\docs") { Copy-Item "$root\docs" $out -Recurse }

Write-Host "== Node.js $nodeVersion =="
Copy-Item $NodeExe "$out\node\node.exe"
$npm = Join-Path (Split-Path $NodeExe) 'npm.cmd'
if (-not (Test-Path $npm)) { $npm = 'npm.cmd' }
Push-Location $out
try {
    & $npm ci --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm ci thất bại' }
} finally { Pop-Location }

Write-Host "== uv ($UvVersion) =="
$uvZip = Join-Path $cache "uv-$UvVersion.zip"
if ($UvVersion -eq 'latest' -or -not (Test-Path $uvZip)) {
    $base = if ($UvVersion -eq 'latest') { 'https://github.com/astral-sh/uv/releases/latest/download' } else { "https://github.com/astral-sh/uv/releases/download/$UvVersion" }
    Invoke-WebRequest "$base/uv-x86_64-pc-windows-msvc.zip" -OutFile $uvZip
}
$uvTmp = Join-Path $cache 'uv'
if (Test-Path $uvTmp) { Remove-Item $uvTmp -Recurse -Force }
Expand-Archive $uvZip $uvTmp
Copy-Item (Get-ChildItem $uvTmp -Recurse -Filter uv.exe | Select-Object -First 1).FullName "$out\tools\uv.exe"
Write-Host (& "$out\tools\uv.exe" --version)

Write-Host "== WebView2 SDK ($WebView2Version) =="
$wvZip = Join-Path $cache "webview2-$WebView2Version.zip"
if (-not (Test-Path $wvZip)) { Invoke-WebRequest "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/$WebView2Version" -OutFile $wvZip }
$wvDir = Join-Path $cache "webview2-$WebView2Version"
if (-not (Test-Path $wvDir)) { Expand-Archive $wvZip $wvDir }
$wvLib = Join-Path $wvDir 'lib\net462'
Copy-Item "$wvLib\Microsoft.Web.WebView2.Core.dll", "$wvLib\Microsoft.Web.WebView2.WinForms.dll", "$wvDir\runtimes\win-x64\native\WebView2Loader.dll" $out

Write-Host '== Biên dịch STTBot.exe =='
Copy-Item "$root\ui" $out -Recurse
$versionCs = Join-Path $cache 'Version.cs'
"[assembly: System.Reflection.AssemblyVersion(`"$version`")]`n[assembly: System.Reflection.AssemblyFileVersion(`"$version`")]" | Set-Content $versionCs -Encoding UTF8
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc -nologo -codepage:65001 -target:winexe -platform:x64 "-out:$out\STTBot.exe" "-win32icon:$PSScriptRoot\icon.ico" `
    -r:System.Windows.Forms.dll -r:System.Drawing.dll -r:System.Web.Extensions.dll `
    "-r:$wvLib\Microsoft.Web.WebView2.Core.dll" "-r:$wvLib\Microsoft.Web.WebView2.WinForms.dll" "$root\launcher\Launcher.cs" $versionCs
if ($LASTEXITCODE -ne 0) { throw 'Biên dịch launcher thất bại' }

Write-Host '== Bản portable (zip) =='
$zip = Join-Path $dist "STTBot-portable-$version.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path $out -DestinationPath $zip -CompressionLevel Optimal
Write-Host "  $zip"

if ($SkipInstaller) { return }
Write-Host '== Bộ cài (Inno Setup) =='
$iscc = @(
    (Get-Command ISCC.exe -ErrorAction SilentlyContinue).Source,
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $iscc) { throw 'Không thấy Inno Setup 6 (winget install JRSoftware.InnoSetup), hoặc chạy với -SkipInstaller' }
& $iscc "/DAppVersion=$version" "$PSScriptRoot\installer.iss"
if ($LASTEXITCODE -ne 0) { throw 'Tạo bộ cài thất bại' }
Write-Host "  $(Join-Path $dist "STTBot-Setup-$version.exe")"
