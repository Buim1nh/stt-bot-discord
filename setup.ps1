# Cài đặt một lần: thư viện Node, môi trường Python cho faster-whisper, file cấu hình mẫu.
# Chạy:  powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '== Cài thư viện Node =='
npm install

Write-Host '== Tạo môi trường Python cho STT =='
if (-not (Test-Path 'stt\.venv\Scripts\python.exe')) {
    py -m venv stt\.venv
}
& stt\.venv\Scripts\python.exe -m pip install --upgrade pip
& stt\.venv\Scripts\python.exe -m pip install -r stt\requirements.txt

Write-Host '== File cấu hình =='
if (-not (Test-Path '.env')) { Copy-Item .env.example .env; Write-Host 'Đã tạo .env, nhớ điền DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID' }
if (-not (Test-Path 'config\glossary.txt')) { Copy-Item config\glossary.example.txt config\glossary.txt; Write-Host 'Đã tạo config\glossary.txt, điền tên riêng trong campaign' }
if (-not (Test-Path 'config\players.json')) { Copy-Item config\players.example.json config\players.json; Write-Host 'Đã tạo config\players.json, nhớ sửa theo nhóm của bạn' }

Write-Host '== Kiểm tra GPU cho Whisper =='
& stt\.venv\Scripts\python.exe stt\check_gpu.py

Write-Host 'Xong. Bước tiếp: điền .env, chạy "npm run deploy-commands", rồi "npm start".'
