; Bộ cài Windows, build bằng build\build.ps1 (cần Inno Setup 6).
; Cài vào thư mục người dùng nên không cần quyền admin, và bot ghi được .env, sessions ngay trong thư mục cài.
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{DD2DC2E7-E330-4287-9272-8178799DFDE9}
AppName=STT Bot DnD
AppVersion={#AppVersion}
AppPublisher=Buim1nh
AppPublisherURL=https://github.com/Buim1nh/stt-bot-discord
DefaultDirName={localappdata}\Programs\STTBotDnD
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=STTBot-Setup-{#AppVersion}
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\STTBot.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes

[Tasks]
Name: "desktopicon"; Description: "Tạo biểu tượng ngoài Desktop"

[Files]
Source: "..\dist\STTBot\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{userprograms}\STT Bot DnD"; Filename: "{app}\STTBot.exe"
Name: "{userdesktop}\STT Bot DnD"; Filename: "{app}\STTBot.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\STTBot.exe"; Description: "Mở STT Bot ngay"; Flags: nowait postinstall skipifsilent

; Gỡ cài đặt thì xoá phần tải về (Python, thư viện, model), giữ lại sessions, .env và config của người dùng
[UninstallDelete]
Type: filesandordirs; Name: "{app}\runtime"
Type: filesandordirs; Name: "{app}\stt\.venv"
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\logs"
