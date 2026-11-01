// STTBot.exe: cửa sổ ứng dụng cho DM không rành kỹ thuật.
// Giao diện là HTML trong thư mục ui/, hiển thị bằng WebView2 (có sẵn trên Windows 10/11).
// File này lo phần phía sau: đọc/ghi cấu hình, gọi Discord API, cài STT, bật/tắt bot.
// Biên dịch bằng csc của .NET Framework 4 (xem build/build.ps1) nên chỉ dùng cú pháp C# 5.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: System.Reflection.AssemblyTitle("STT Bot DnD")]
[assembly: System.Reflection.AssemblyProduct("STT Bot DnD")]

namespace SttBotLauncher
{
    static class Program
    {
        [DllImport("user32.dll")]
        static extern bool SetProcessDPIAware();
        [DllImport("user32.dll")]
        static extern bool SetProcessDpiAwarenessContext(IntPtr value);

        [STAThread]
        static void Main()
        {
            bool created;
            using (var mutex = new Mutex(true, "STTBotDnD-Launcher", out created))
            {
                if (!created)
                {
                    MessageBox.Show("STT Bot đang mở rồi, xem trên thanh taskbar.", "STT Bot DnD");
                    return;
                }
                try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } // per-monitor v2, Windows 10 1703+
                catch { SetProcessDPIAware(); }
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainForm());
            }
        }
    }

    /// <summary>Đọc/ghi .env mà vẫn giữ nguyên comment và thứ tự dòng.</summary>
    class EnvFile
    {
        readonly string path;
        readonly List<string> lines;

        public EnvFile(string path)
        {
            this.path = path;
            lines = File.Exists(path) ? File.ReadAllLines(path, Encoding.UTF8).ToList() : new List<string>();
        }

        int IndexOf(string key)
        {
            for (int i = 0; i < lines.Count; i++)
            {
                var line = lines[i].TrimStart();
                if (line.StartsWith("#")) continue;
                int eq = line.IndexOf('=');
                if (eq > 0 && line.Substring(0, eq).Trim() == key) return i;
            }
            return -1;
        }

        public string Get(string key)
        {
            int i = IndexOf(key);
            if (i < 0) return "";
            var line = lines[i];
            return line.Substring(line.IndexOf('=') + 1).Trim();
        }

        public void Set(string key, string value)
        {
            int i = IndexOf(key);
            var line = key + "=" + value;
            if (i >= 0) lines[i] = line;
            else lines.Add(line);
        }

        public void Save()
        {
            File.WriteAllLines(path, lines, new UTF8Encoding(false));
        }
    }

    /// <summary>Lỗi có lời nhắn dành cho người dùng, hiển thị nguyên văn trên giao diện.</summary>
    class UserError : Exception
    {
        public UserError(string message) : base(message) { }
    }

    class MainForm : Form
    {
        // Quyền bot cần: View Channels, Send Messages, Attach Files, Connect, Speak
        const string BotPermissions = "3181568";
        const string DiscordApi = "https://discord.com/api/v10";
        static readonly Regex Ansi = new Regex(@"\x1B\[[0-?]*[ -/]*[@-~]");
        // ID giả trong players.example.json, coi như chưa khai báo
        static readonly HashSet<string> ExampleIds = new HashSet<string> { "123456789012345678", "234567890123456789", "345678901234567890" };
        static readonly string[] SessionFiles = { "recap.md", "notes.md", "transcript_clean.md", "transcript_raw.md" };

        readonly string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        readonly string logFile;
        readonly object logLock = new object();
        readonly List<string> logBuffer = new List<string>();
        readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        readonly HashSet<int> children = new HashSet<int>(); // tiến trình cài đặt/xử lý đang chạy, dừng khi đóng app

        readonly WebView2 web;
        bool webReady;
        Process bot;
        string botState = "offline";
        string botName = "";
        DateTime botSince;
        bool installing;
        string installLabel = "";
        string processingId;
        bool closingAfterStop;

        public MainForm()
        {
            logFile = Path.Combine(appDir, "logs", "STTBot.log");
            Text = "STT Bot DnD";
            BackColor = Color.FromArgb(13, 12, 19);
            ClientSize = new Size(1180, 780);
            MinimumSize = new Size(980, 680);
            StartPosition = FormStartPosition.CenterScreen;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            EnsureConfigFiles();
            web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = BackColor };
            Controls.Add(web);
            FormClosing += OnFormClosing;
            FormClosed += (s, e) => KillChildren();
            HandleCreated += (s, e) => UseDarkTitleBar();
            Load += async (s, e) => await InitWebView();
        }

        // ---------- Cửa sổ và WebView2 ----------

        [DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

        void UseDarkTitleBar()
        {
            try
            {
                int on = 1;
                DwmSetWindowAttribute(Handle, 20, ref on, 4); // DWMWA_USE_IMMERSIVE_DARK_MODE
                int caption = 0x00130C0D; // DWMWA_CAPTION_COLOR (BGR), cùng màu nền giao diện
                DwmSetWindowAttribute(Handle, 35, ref caption, 4);
            }
            catch { }
        }

        async Task InitWebView()
        {
            try
            {
                var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(appDir, "runtime", "webview"));
                await web.EnsureCoreWebView2Async(env);
            }
            catch (Exception err)
            {
                var answer = MessageBox.Show(
                    "Máy chưa có Microsoft Edge WebView2, thành phần Windows cần để hiển thị giao diện.\n" +
                    "Bấm OK để mở trang tải (cài khoảng 1 phút), cài xong mở lại STT Bot.\n\nChi tiết: " + err.Message,
                    "STT Bot DnD", MessageBoxButtons.OKCancel, MessageBoxIcon.Warning);
                if (answer == DialogResult.OK) OpenExternal("https://go.microsoft.com/fwlink/p/?LinkId=2124703");
                Close();
                return;
            }

            var core = web.CoreWebView2;
            var debug = Environment.GetEnvironmentVariable("STTBOT_DEVTOOLS") == "1";
            core.Settings.AreDevToolsEnabled = debug;
            core.Settings.AreDefaultContextMenusEnabled = debug;
            core.Settings.AreBrowserAcceleratorKeysEnabled = debug;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = false;
            core.SetVirtualHostNameToFolderMapping("app.local", Path.Combine(appDir, "ui"), CoreWebView2HostResourceAccessKind.Allow);
            core.WebMessageReceived += OnWebMessage;
            core.NewWindowRequested += (s, e) =>
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            core.NavigationStarting += (s, e) =>
            {
                if (e.Uri.StartsWith("https://app.local/")) return;
                e.Cancel = true;
                OpenExternal(e.Uri);
            };
            core.NavigationCompleted += (s, e) => { webReady = true; };
            core.Navigate("https://app.local/index.html");
            Log("Thư mục cài đặt: " + appDir);
        }

        void Push(object message)
        {
            if (IsDisposed || !webReady) return;
            var text = json.Serialize(message);
            Action send = () =>
            {
                try { web.CoreWebView2.PostWebMessageAsJson(text); } catch { }
            };
            if (!InvokeRequired)
            {
                send();
                return;
            }
            try { BeginInvoke(send); } catch { }
        }

        async void OnWebMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            webReady = true; // trang đã chạy script, có thể nhận tin nhắn
            Dictionary<string, object> msg;
            try { msg = json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson); }
            catch { return; }
            object id;
            msg.TryGetValue("id", out id);
            object rawArgs;
            msg.TryGetValue("args", out rawArgs);
            var args = rawArgs as Dictionary<string, object> ?? new Dictionary<string, object>();
            var cmd = Str(msg, "cmd");
            try
            {
                var result = await Dispatch(cmd, args);
                Push(new Dictionary<string, object> { { "id", id }, { "ok", true }, { "result", result } });
            }
            catch (Exception err)
            {
                if (!(err is UserError)) Log(cmd + ": " + err);
                Push(new Dictionary<string, object> { { "id", id }, { "ok", false }, { "error", err is UserError ? err.Message : "Lỗi: " + err.Message } });
            }
        }

        static string Str(Dictionary<string, object> d, string key)
        {
            object v;
            return d != null && d.TryGetValue(key, out v) && v != null ? Convert.ToString(v) : "";
        }

        static string Field(object o, string key)
        {
            return Str(o as Dictionary<string, object>, key);
        }

        async Task<object> Dispatch(string cmd, Dictionary<string, object> a)
        {
            switch (cmd)
            {
                case "getState": return await GetState();
                case "getLog": lock (logLock) return logBuffer.ToArray();
                case "verifyToken": return await VerifyToken(Str(a, "token"));
                case "listRoles": return await ListRoles(Str(a, "guildId"));
                case "saveConfig": SaveConfig(a); return await GetState();
                case "openUrl": OpenExternal(Str(a, "url")); return null;
                case "openPath": OpenPath(Str(a, "kind")); return null;
                case "installStt": BeginInstallStt(); return null;
                case "installClaude": await InstallClaude(); return await ClaudeStatus();
                case "loginClaude": await LoginClaude(); return await ClaudeStatus();
                case "claudeStatus": return await ClaudeStatus();
                case "startBot": await StartBot(); return null;
                case "stopBot": StopBot(); return null;
                case "listSessions": return ListSessions();
                case "readSessionFile": return ReadSessionFile(Str(a, "id"), Str(a, "file"));
                case "openSession": OpenSession(Str(a, "id"), Str(a, "file")); return null;
                case "processSession": BeginProcessSession(Str(a, "id")); return null;
                case "getCampaign": return GetCampaign();
                case "savePlayers": SavePlayers(a.ContainsKey("players") ? a["players"] as object[] : null); return GetCampaign();
                case "saveGlossary": SaveGlossary(Str(a, "text")); return null;
                default: throw new UserError("Lệnh không hợp lệ: " + cmd);
            }
        }

        // ---------- Nhật ký ----------

        void Log(string text)
        {
            text = Ansi.Replace(text ?? "", "").TrimEnd();
            if (text.Length == 0) return;
            var line = DateTime.Now.ToString("HH:mm:ss") + "  " + text;
            lock (logLock)
            {
                logBuffer.Add(line);
                if (logBuffer.Count > 1500) logBuffer.RemoveRange(0, 500);
                try
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(logFile));
                    var info = new FileInfo(logFile);
                    if (info.Exists && info.Length > 5 * 1024 * 1024)
                    {
                        File.Copy(logFile, logFile + ".old", true);
                        File.Delete(logFile);
                    }
                    File.AppendAllText(logFile, DateTime.Now.ToString("yyyy-MM-dd ") + line + Environment.NewLine, Encoding.UTF8);
                }
                catch { }
            }
            Push(new Dictionary<string, object> { { "event", "log" }, { "line", line } });
        }

        // ---------- Cấu hình ----------

        string EnvPath { get { return Path.Combine(appDir, ".env"); } }
        string ConfigDir { get { return Path.Combine(appDir, "config"); } }
        string PlayersFile { get { return Path.Combine(ConfigDir, "players.json"); } }
        string GlossaryFile { get { return Path.Combine(ConfigDir, "glossary.txt"); } }

        string SessionsDir
        {
            get
            {
                var dir = new EnvFile(EnvPath).Get("SESSIONS_DIR");
                if (dir == "") dir = "sessions";
                return Path.IsPathRooted(dir) ? dir : Path.Combine(appDir, dir);
            }
        }

        void EnsureConfigFiles()
        {
            try
            {
                Directory.CreateDirectory(ConfigDir);
                if (!File.Exists(EnvPath) && File.Exists(Path.Combine(appDir, ".env.example"))) File.Copy(Path.Combine(appDir, ".env.example"), EnvPath);
                var glossaryExample = Path.Combine(ConfigDir, "glossary.example.txt");
                if (!File.Exists(GlossaryFile) && File.Exists(glossaryExample)) File.Copy(glossaryExample, GlossaryFile);
                Directory.CreateDirectory(SessionsDir);
            }
            catch (Exception err)
            {
                MessageBox.Show("Không tạo được file cấu hình: " + err.Message, "STT Bot DnD");
            }
        }

        async Task<object> GetState()
        {
            var env = new EnvFile(EnvPath);
            Func<string, string, string> get = (key, fallback) => env.Get(key) == "" ? fallback : env.Get(key);
            bool gpu = HasNvidiaGpu();
            var claude = await ClaudeStatus();
            return new Dictionary<string, object>
            {
                { "version", Regex.Replace(Application.ProductVersion, @"\.0$", "") },
                { "appDir", appDir },
                { "config", new Dictionary<string, object>
                    {
                        { "token", env.Get("DISCORD_TOKEN") },
                        { "clientId", env.Get("DISCORD_CLIENT_ID") },
                        { "guildId", env.Get("DISCORD_GUILD_ID") },
                        { "roleId", env.Get("DM_ROLE_ID") },
                        { "llm", get("LLM_PROVIDER", "claude") },
                        { "whisperModel", get("WHISPER_MODEL", "large-v3-turbo") },
                        { "silenceMs", get("SILENCE_MS", "1200") },
                    }
                },
                { "stt", new Dictionary<string, object>
                    {
                        { "ready", SttReady() },
                        { "venv", File.Exists(VenvPython) },
                        { "gpu", gpu },
                        { "gpuName", gpu ? GpuName() : "" },
                        { "installing", installing },
                        { "label", installLabel },
                    }
                },
                { "claude", claude },
                { "bot", BotInfo() },
                { "processingId", processingId ?? "" },
            };
        }

        void SaveConfig(Dictionary<string, object> a)
        {
            var env = new EnvFile(EnvPath);
            var map = new Dictionary<string, string>
            {
                { "token", "DISCORD_TOKEN" }, { "clientId", "DISCORD_CLIENT_ID" }, { "guildId", "DISCORD_GUILD_ID" },
                { "roleId", "DM_ROLE_ID" }, { "llm", "LLM_PROVIDER" }, { "whisperModel", "WHISPER_MODEL" }, { "silenceMs", "SILENCE_MS" },
            };
            foreach (var kv in map)
            {
                if (!a.ContainsKey(kv.Key)) continue;
                var value = Str(a, kv.Key).Trim();
                if ((kv.Key == "clientId" || kv.Key == "guildId" || kv.Key == "roleId") && value != "" && !Regex.IsMatch(value, @"^\d{15,25}$"))
                    throw new UserError("ID không hợp lệ: " + value);
                if (kv.Key == "silenceMs" && !Regex.IsMatch(value, @"^\d{3,5}$")) throw new UserError("Thời gian im lặng không hợp lệ.");
                if (kv.Key == "llm" && !Regex.IsMatch(value, "^(claude|gemini|none)$")) throw new UserError("Lựa chọn biên tập không hợp lệ.");
                if (kv.Key == "whisperModel" && !Regex.IsMatch(value, @"^[\w.\-]+$")) throw new UserError("Model không hợp lệ.");
                env.Set(kv.Value, value);
            }
            env.Save();
            Log("Đã lưu cấu hình.");
        }

        // ---------- Discord API ----------

        Task<object> DiscordGet(string token, string path)
        {
            return Task.Run(() =>
            {
                var req = (HttpWebRequest)WebRequest.Create(DiscordApi + path);
                req.Headers["Authorization"] = "Bot " + token;
                req.UserAgent = "DiscordBot (https://github.com/Buim1nh/stt-bot-discord, 1.0)";
                req.Timeout = 15000;
                try
                {
                    using (var res = (HttpWebResponse)req.GetResponse())
                    using (var reader = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
                        return json.DeserializeObject(reader.ReadToEnd());
                }
                catch (WebException err)
                {
                    var res = err.Response as HttpWebResponse;
                    if (res == null) throw new UserError("Không kết nối được Discord, kiểm tra mạng.");
                    var code = (int)res.StatusCode;
                    if (code == 401) throw new UserError("Token không đúng. Vào trang Discord Developer, tab Bot, bấm Reset Token rồi copy lại.");
                    if (code == 403 || code == 404) throw new UserError("Bot chưa được mời vào server này.");
                    throw new UserError("Discord trả lỗi " + code + ", thử lại sau ít phút.");
                }
            });
        }

        async Task<object> VerifyToken(string token)
        {
            token = token.Trim().Trim('"');
            if (token.Length < 50) throw new UserError("Token quá ngắn. Token thật dài khoảng 70 ký tự, dạng MTE...xyz.");
            var app = await DiscordGet(token, "/applications/@me") as Dictionary<string, object>;
            if (app == null) throw new UserError("Discord trả về dữ liệu lạ, thử lại.");
            object botUser;
            if (!app.TryGetValue("bot", out botUser) || !(botUser is Dictionary<string, object>)) botUser = await DiscordGet(token, "/users/@me");
            var guilds = await DiscordGet(token, "/users/@me/guilds") as object[] ?? new object[0];
            var userId = Field(botUser, "id");
            var avatar = Field(botUser, "avatar");
            var clientId = Str(app, "id");
            return new Dictionary<string, object>
            {
                { "token", token },
                { "clientId", clientId },
                { "botName", Field(botUser, "username") },
                { "avatarUrl", avatar == "" ? "" : "https://cdn.discordapp.com/avatars/" + userId + "/" + avatar + ".png?size=128" },
                { "inviteUrl", "https://discord.com/oauth2/authorize?client_id=" + clientId + "&scope=bot%20applications.commands&permissions=" + BotPermissions },
                { "guilds", guilds.Select(g => new Dictionary<string, object>
                    {
                        { "id", Field(g, "id") },
                        { "name", Field(g, "name") },
                        { "iconUrl", Field(g, "icon") == "" ? "" : "https://cdn.discordapp.com/icons/" + Field(g, "id") + "/" + Field(g, "icon") + ".png?size=64" },
                    }).ToArray() },
            };
        }

        async Task<object> ListRoles(string guildId)
        {
            var token = new EnvFile(EnvPath).Get("DISCORD_TOKEN");
            if (token == "" || guildId == "") return new object[0];
            var roles = await DiscordGet(token, "/guilds/" + guildId + "/roles") as object[] ?? new object[0];
            return roles
                .OfType<Dictionary<string, object>>()
                .Where(r => Str(r, "id") != guildId && Str(r, "managed") != "True")
                .OrderByDescending(r => Convert.ToInt32(r["position"]))
                .Select(r =>
                {
                    var color = Convert.ToInt32(r["color"]);
                    return new Dictionary<string, object>
                    {
                        { "id", Str(r, "id") }, { "name", Str(r, "name") }, { "color", color == 0 ? "" : "#" + color.ToString("x6") },
                    };
                })
                .ToArray();
        }

        // ---------- Chạy tiến trình con ----------

        string UvPath { get { return Path.Combine(appDir, "tools", "uv.exe"); } }
        string VenvPython { get { return Path.Combine(appDir, @"stt\.venv\Scripts\python.exe"); } }

        string NodePath
        {
            get
            {
                var bundled = Path.Combine(appDir, "node", "node.exe");
                return File.Exists(bundled) ? bundled : FindOnPath("node.exe") ?? "node";
            }
        }

        static string FindOnPath(string exe)
        {
            foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))
            {
                try
                {
                    if (dir.Trim() == "") continue;
                    var p = Path.Combine(dir.Trim(), exe);
                    if (File.Exists(p)) return p;
                }
                catch { }
            }
            return null;
        }

        static string FindClaude()
        {
            var local = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), @".local\bin\claude.exe");
            return File.Exists(local) ? local : FindOnPath("claude.exe");
        }

        static string NvidiaSmi()
        {
            var sys = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "nvidia-smi.exe");
            return File.Exists(sys) ? sys : FindOnPath("nvidia-smi.exe");
        }

        static bool HasNvidiaGpu() { return NvidiaSmi() != null; }

        string gpuName;
        string GpuName()
        {
            if (gpuName != null) return gpuName;
            gpuName = "GPU NVIDIA";
            try
            {
                var psi = new ProcessStartInfo(NvidiaSmi(), "--query-gpu=name --format=csv,noheader")
                {
                    UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true,
                };
                using (var p = Process.Start(psi))
                {
                    var name = p.StandardOutput.ReadToEnd().Split('\n')[0].Trim();
                    p.WaitForExit(5000);
                    if (name != "") gpuName = name;
                }
            }
            catch { }
            return gpuName;
        }

        void ApplyEnv(ProcessStartInfo psi)
        {
            var runtime = Path.Combine(appDir, "runtime");
            psi.EnvironmentVariables["UV_PYTHON_INSTALL_DIR"] = Path.Combine(runtime, "python");
            psi.EnvironmentVariables["UV_CACHE_DIR"] = Path.Combine(runtime, "uv-cache");
            psi.EnvironmentVariables["UV_NO_PROGRESS"] = "1";
            psi.EnvironmentVariables["HF_HOME"] = Path.Combine(runtime, "huggingface");
            psi.EnvironmentVariables["HF_HUB_DISABLE_PROGRESS_BARS"] = "1";
            psi.EnvironmentVariables["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1";
            psi.EnvironmentVariables["NO_COLOR"] = "1";
            psi.EnvironmentVariables["PYTHONIOENCODING"] = "utf-8";
            psi.EnvironmentVariables["PYTHONUTF8"] = "1";
            var claude = FindClaude();
            if (claude != null) psi.EnvironmentVariables["CLAUDE_BIN"] = claude;
        }

        /// <summary>Chạy một lệnh, đưa output vào nhật ký, trả về mã thoát (-1 nếu không chạy được).</summary>
        Task<int> RunAsync(string file, string args, StringBuilder capture = null, bool quiet = false, Action<string> onLine = null)
        {
            var tcs = new TaskCompletionSource<int>();
            var psi = new ProcessStartInfo(file, args)
            {
                WorkingDirectory = appDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = new UTF8Encoding(false),
                StandardErrorEncoding = new UTF8Encoding(false),
            };
            ApplyEnv(psi);
            var p = new Process { StartInfo = psi, EnableRaisingEvents = true };
            DataReceivedEventHandler onData = (s, e) =>
            {
                if (e.Data == null) return;
                if (capture != null) lock (capture) capture.AppendLine(e.Data);
                if (!quiet) Log(e.Data);
                if (onLine != null) onLine(e.Data);
            };
            p.OutputDataReceived += onData;
            p.ErrorDataReceived += onData;
            p.Exited += (s, e) =>
            {
                p.WaitForExit(); // đợi đọc hết output
                lock (children) children.Remove(p.Id);
                tcs.TrySetResult(p.ExitCode);
                p.Dispose();
            };
            try
            {
                p.Start();
                lock (children) children.Add(p.Id);
                p.BeginOutputReadLine();
                p.BeginErrorReadLine();
            }
            catch (Exception err)
            {
                if (!quiet) Log("Không chạy được " + file + ": " + err.Message);
                tcs.TrySetResult(-1);
            }
            return tcs.Task;
        }

        /// <summary>Mở một cửa sổ console riêng (để người dùng thao tác, ví dụ đăng nhập) và đợi nó đóng.</summary>
        Task<int> RunVisibleAsync(string file, string args)
        {
            return Task.Run(() =>
            {
                try
                {
                    var psi = new ProcessStartInfo(file, args) { UseShellExecute = false, WorkingDirectory = appDir };
                    ApplyEnv(psi);
                    using (var p = Process.Start(psi))
                    {
                        p.WaitForExit();
                        return p.ExitCode;
                    }
                }
                catch (Exception err)
                {
                    Log("Không chạy được " + file + ": " + err.Message);
                    return -1;
                }
            });
        }

        // ---------- STT ----------

        string SttMarker { get { return Path.Combine(appDir, @"stt\.venv\installed.txt"); } }

        string SttFingerprint(bool gpu)
        {
            using (var sha = SHA256.Create())
            {
                var text = gpu ? "gpu\n" : "cpu\n";
                foreach (var name in gpu ? new[] { "requirements.txt", "requirements-gpu.txt" } : new[] { "requirements.txt" })
                {
                    var f = Path.Combine(appDir, "stt", name);
                    text += File.Exists(f) ? File.ReadAllText(f) : "";
                }
                return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(text))).Replace("-", "");
            }
        }

        bool SttReady()
        {
            if (!File.Exists(VenvPython) || !File.Exists(SttMarker)) return false;
            return File.ReadAllText(SttMarker).Trim() == SttFingerprint(HasNvidiaGpu());
        }

        void PushStt(string phase, int step, int total, string label, string message)
        {
            installLabel = label;
            Push(new Dictionary<string, object>
            {
                { "event", "stt" }, { "phase", phase }, { "step", step }, { "total", total }, { "label", label }, { "message", message ?? "" },
            });
        }

        void BeginInstallStt()
        {
            if (installing) return;
            if (!File.Exists(UvPath)) throw new UserError("Thiếu tools\\uv.exe. Hãy cài lại bằng bộ cài STTBot-Setup.exe.");
            installing = true;
            var task = InstallStt();
        }

        async Task InstallStt()
        {
            bool gpu = HasNvidiaGpu();
            var steps = new List<string> { "Tải Python", "Cài bộ nhận dạng giọng nói" };
            if (gpu) steps.Add("Cài thư viện GPU (khoảng 2GB)");
            steps.Add("Tải model Whisper (khoảng 1.6GB)");
            int step = 0;
            Action next = () =>
            {
                step++;
                PushStt("running", step, steps.Count, steps[step - 1], null);
                Log("== " + steps[step - 1] + " ==");
            };
            try
            {
                var py = "\"" + VenvPython + "\"";
                next();
                if (!File.Exists(VenvPython) && await RunAsync(UvPath, "venv stt\\.venv --python 3.12") != 0)
                    throw new UserError("tạo môi trường Python thất bại");
                next();
                if (await RunAsync(UvPath, "pip install --python " + py + " -r stt\\requirements.txt") != 0)
                    throw new UserError("cài faster-whisper thất bại");
                if (gpu)
                {
                    next();
                    if (await RunAsync(UvPath, "pip install --python " + py + " -r stt\\requirements-gpu.txt") != 0)
                        throw new UserError("cài thư viện CUDA thất bại");
                }

                var env = new EnvFile(EnvPath);
                env.Set("WHISPER_DEVICE", gpu ? "cuda" : "cpu");
                env.Set("WHISPER_COMPUTE_TYPE", gpu ? "int8_float16" : "int8");
                env.Save();

                next();
                if (await RunAsync(VenvPython, "-X utf8 stt\\check_gpu.py") != 0) throw new UserError("chạy thử Whisper thất bại");

                File.WriteAllText(SttMarker, SttFingerprint(gpu));
                Log("== Cài phần chuyển giọng nói xong ==");
                installing = false;
                PushStt("done", steps.Count, steps.Count, "Đã cài xong", null);
            }
            catch (Exception err)
            {
                Log("LỖI: " + err.Message);
                installing = false;
                PushStt("error", step, steps.Count, steps[Math.Max(0, step - 1)],
                    "Cài chưa xong (" + err.Message + "). Kiểm tra mạng rồi bấm thử lại, phần đã tải sẽ không phải tải lại.");
            }
        }

        // ---------- Claude ----------

        async Task<object> ClaudeStatus()
        {
            var claude = FindClaude();
            var result = new Dictionary<string, object> { { "installed", claude != null }, { "loggedIn", false }, { "email", "" }, { "plan", "" } };
            if (claude == null) return result;
            var output = new StringBuilder();
            await RunAsync(claude, "auth status", output, true);
            var text = output.ToString();
            result["loggedIn"] = Regex.IsMatch(text, "\"loggedIn\"\\s*:\\s*true");
            var m = Regex.Match(text, "\"email\"\\s*:\\s*\"([^\"]+)\"");
            if (m.Success) result["email"] = m.Groups[1].Value;
            m = Regex.Match(text, "\"subscriptionType\"\\s*:\\s*\"([^\"]+)\"");
            if (m.Success) result["plan"] = m.Groups[1].Value;
            return result;
        }

        async Task InstallClaude()
        {
            Log("Đang cài Claude Code trong cửa sổ riêng...");
            await RunVisibleAsync("powershell.exe",
                "-NoProfile -ExecutionPolicy Bypass -Command \"irm https://claude.ai/install.ps1 | iex; Read-Host 'Xong. Bam Enter de dong cua so nay'\"");
            Log(FindClaude() != null ? "Đã cài Claude Code." : "Chưa thấy Claude Code sau khi cài.");
        }

        async Task LoginClaude()
        {
            var claude = FindClaude();
            if (claude == null) throw new UserError("Chưa cài Claude Code.");
            await RunVisibleAsync(claude, "auth login");
        }

        // ---------- Bot ----------

        object BotInfo()
        {
            return new Dictionary<string, object>
            {
                { "state", botState },
                { "name", botName },
                { "since", bot != null ? (long)(botSince.ToUniversalTime() - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds : 0L },
            };
        }

        void SetBotState(string state)
        {
            botState = state;
            Push(new Dictionary<string, object> { { "event", "bot" }, { "bot", BotInfo() } });
        }

        async Task StartBot()
        {
            if (bot != null || botState == "starting") return;
            var env = new EnvFile(EnvPath);
            if (env.Get("DISCORD_TOKEN") == "" || env.Get("DISCORD_GUILD_ID") == "")
                throw new UserError("Chưa kết nối bot Discord. Vào Cài đặt để dán token và chọn server.");

            SetBotState("starting");
            var output = new StringBuilder();
            if (await RunAsync(NodePath, "src\\deploy-commands.js", output) != 0)
            {
                SetBotState("offline");
                var detail = output.ToString();
                if (detail.Contains("Missing Access") || detail.Contains("50001"))
                    throw new UserError("Bot chưa ở trong server đã chọn. Vào Cài đặt, bấm \"Mời bot vào server\".");
                throw new UserError("Không đăng ký được lệnh với Discord. Xem chi tiết trong Nhật ký.");
            }

            var psi = new ProcessStartInfo(NodePath, "src\\index.js")
            {
                WorkingDirectory = appDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = new UTF8Encoding(false),
                StandardErrorEncoding = new UTF8Encoding(false),
            };
            ApplyEnv(psi);
            psi.EnvironmentVariables["BOT_STDIN_CONTROL"] = "1";
            var p = new Process { StartInfo = psi, EnableRaisingEvents = true };
            p.OutputDataReceived += (s, ev) =>
            {
                if (ev.Data == null) return;
                Log(ev.Data);
                var m = Regex.Match(ev.Data, "Bot đã online: (.+)$");
                if (m.Success)
                {
                    botName = m.Groups[1].Value.Trim();
                    SetBotState("online");
                }
            };
            p.ErrorDataReceived += (s, ev) => { if (ev.Data != null) Log(ev.Data); };
            p.Exited += (s, ev) =>
            {
                p.WaitForExit();
                var exit = p.ExitCode;
                try { BeginInvoke(new Action(() => OnBotExited(exit))); } catch { }
            };
            try
            {
                p.Start();
                p.BeginOutputReadLine();
                p.BeginErrorReadLine();
            }
            catch (Exception err)
            {
                SetBotState("offline");
                throw new UserError("Không bật được bot: " + err.Message);
            }
            bot = p;
            botSince = DateTime.Now;
            SetBotState("connecting");
        }

        void OnBotExited(int code)
        {
            Log("Bot đã tắt (mã " + code + ").");
            var wasStopping = botState == "stopping";
            bot = null;
            SetBotState(code == 0 || wasStopping ? "offline" : "crashed");
            if (closingAfterStop) Close();
        }

        void StopBot()
        {
            var p = bot;
            if (p == null) return;
            SetBotState("stopping");
            try
            {
                p.StandardInput.WriteLine("stop");
                p.StandardInput.Flush();
            }
            catch { }
            // Không tắt êm trong 20 giây thì buộc dừng
            Task.Delay(20000).ContinueWith(t =>
            {
                try
                {
                    if (p.HasExited) return;
                    Log("Bot không phản hồi, buộc dừng.");
                    p.Kill();
                }
                catch { }
            });
        }

        void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            if (bot != null)
            {
                e.Cancel = true;
                if (closingAfterStop) return;
                if (MessageBox.Show("Bot đang chạy. Tắt bot và thoát?\nPhần đang ghi âm (nếu có) vẫn được lưu lại.", "STT Bot DnD",
                        MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
                closingAfterStop = true;
                StopBot();
                return;
            }
            if (!installing && processingId == null) return;
            var question = installing
                ? "Đang cài đặt dở, thoát bây giờ thì lần sau phải bấm cài lại. Vẫn thoát?"
                : "Đang xử lý session, thoát bây giờ sẽ dừng giữa chừng (lần sau chạy lại sẽ làm tiếp). Vẫn thoát?";
            if (MessageBox.Show(question, "STT Bot DnD", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) e.Cancel = true;
        }

        void KillChildren()
        {
            int[] ids;
            lock (children) ids = children.ToArray();
            foreach (var id in ids)
            {
                try
                {
                    using (var k = Process.Start(new ProcessStartInfo("taskkill.exe", "/T /F /PID " + id) { UseShellExecute = false, CreateNoWindow = true })) k.WaitForExit(5000);
                }
                catch { }
            }
        }

        // ---------- Session ----------

        string SessionDir(string id)
        {
            if (!Regex.IsMatch(id ?? "", @"^[\w\-. ]+$") || id.Contains("..")) throw new UserError("Session không hợp lệ.");
            var dir = Path.Combine(SessionsDir, id);
            if (!Directory.Exists(dir)) throw new UserError("Không thấy session " + id + ".");
            return dir;
        }

        Dictionary<string, object> ReadMeta(string dir)
        {
            try { return json.Deserialize<Dictionary<string, object>>(File.ReadAllText(Path.Combine(dir, "session.json"), Encoding.UTF8)); }
            catch { return null; }
        }

        object ListSessions()
        {
            if (!Directory.Exists(SessionsDir)) return new object[0];
            return new DirectoryInfo(SessionsDir).GetDirectories()
                .OrderByDescending(d => d.Name)
                .Take(100)
                .Select(d =>
                {
                    var meta = ReadMeta(d.FullName);
                    var audio = Path.Combine(d.FullName, "audio");
                    object speakersObj = null;
                    if (meta != null) meta.TryGetValue("speakers", out speakersObj);
                    var speakers = speakersObj as Dictionary<string, object>;
                    var recap = Path.Combine(d.FullName, "recap.md");
                    string title = "", preview = "";
                    if (File.Exists(recap))
                    {
                        // Dòng tiêu đề đầu tiên của recap làm tên buổi, phần còn lại (bỏ tiêu đề mục) làm đoạn xem trước
                        var lines = File.ReadAllLines(recap, Encoding.UTF8);
                        var heading = lines.FirstOrDefault(l => l.StartsWith("#"));
                        if (heading != null) title = Regex.Replace(heading.TrimStart('#').Trim(), @"^recap\s*[:\-–—]\s*", "", RegexOptions.IgnoreCase);
                        preview = string.Join(" ", lines.Where(l => !l.TrimStart().StartsWith("#")));
                        preview = Regex.Replace(Regex.Replace(preview, @"[*_>`]+|^\s*[-+]\s", ""), @"\s+", " ").Trim();
                        if (preview.Length > 260) preview = preview.Substring(0, 260) + "…";
                    }
                    return new Dictionary<string, object>
                    {
                        { "id", d.Name },
                        { "title", title },
                        { "channel", Str(meta, "channelName") },
                        { "startedAt", Str(meta, "startedAt") },
                        { "endedAt", Str(meta, "endedAt") },
                        { "segments", Directory.Exists(audio) ? Directory.GetFiles(audio, "*.ogg").Length : 0 },
                        { "speakers", speakers == null ? new string[0] : speakers.Values.Select(v => Field(v, "displayName")).ToArray() },
                        { "files", SessionFiles.Where(f => File.Exists(Path.Combine(d.FullName, f))).ToArray() },
                        { "preview", preview },
                    };
                })
                .ToArray();
        }

        object ReadSessionFile(string id, string file)
        {
            if (!SessionFiles.Contains(file)) throw new UserError("File không hợp lệ.");
            var path = Path.Combine(SessionDir(id), file);
            return File.Exists(path) ? File.ReadAllText(path, Encoding.UTF8) : "";
        }

        void OpenSession(string id, string file)
        {
            var dir = SessionDir(id);
            if (file == "") Process.Start("explorer.exe", "\"" + dir + "\"");
            else if (SessionFiles.Contains(file)) Process.Start("notepad.exe", "\"" + Path.Combine(dir, file) + "\"");
        }

        void PushProcess(string id, string phase, string label)
        {
            Push(new Dictionary<string, object> { { "event", "process" }, { "id", id }, { "phase", phase }, { "label", label } });
        }

        void BeginProcessSession(string id)
        {
            var dir = SessionDir(id);
            if (bot != null) throw new UserError("Bot đang chạy: gõ /process session:" + id + " trong Discord để bot xử lý và đăng recap lên kênh.");
            if (processingId != null) throw new UserError("Đang xử lý session " + processingId + ", đợi xong đã.");
            if (!SttReady()) throw new UserError("Chưa cài phần chuyển giọng nói. Vào Tổng quan, bấm Cài đặt ở thẻ Nhận dạng giọng nói.");
            processingId = id;
            var task = ProcessSession(id, dir);
        }

        async Task ProcessSession(string id, string dir)
        {
            PushProcess(id, "running", "Bắt đầu...");
            var label = "";
            int code = await RunAsync(NodePath, "src\\cli.js all \"" + dir + "\"", null, false, line =>
            {
                var matches = Regex.Matches(line, @"(STT|LLM) (\d+)/(\d+)");
                if (matches.Count == 0) return;
                var last = matches[matches.Count - 1];
                var now = (last.Groups[1].Value == "STT" ? "Nhận dạng giọng nói " : "Biên tập recap ") + last.Groups[2].Value + "/" + last.Groups[3].Value;
                if (now == label) return;
                label = now;
                PushProcess(id, "running", label);
            });
            processingId = null;
            PushProcess(id, code == 0 ? "done" : "error", code == 0 ? "Xong" : "Lỗi, xem Nhật ký");
        }

        // ---------- Chiến dịch: người chơi và tên riêng ----------

        object GetCampaign()
        {
            var players = new List<object>();
            Dictionary<string, object> raw = null;
            try
            {
                if (File.Exists(PlayersFile)) raw = json.Deserialize<Dictionary<string, object>>(File.ReadAllText(PlayersFile, Encoding.UTF8));
            }
            catch { }
            if (raw != null)
            {
                foreach (var kv in raw)
                {
                    if (!Regex.IsMatch(kv.Key, @"^\d+$") || ExampleIds.Contains(kv.Key)) continue;
                    players.Add(new Dictionary<string, object>
                    {
                        { "id", kv.Key }, { "name", Field(kv.Value, "name") }, { "character", Field(kv.Value, "character") },
                        { "role", Field(kv.Value, "role") == "dm" ? "dm" : "player" },
                    });
                }
            }

            // Người từng nói trong các buổi đã ghi, để thêm nhanh mà không cần bật Developer Mode
            var seen = new Dictionary<string, Dictionary<string, object>>();
            if (Directory.Exists(SessionsDir))
            {
                foreach (var d in new DirectoryInfo(SessionsDir).GetDirectories().OrderByDescending(x => x.Name))
                {
                    var meta = ReadMeta(d.FullName);
                    object speakersObj = null;
                    if (meta != null) meta.TryGetValue("speakers", out speakersObj);
                    var speakers = speakersObj as Dictionary<string, object>;
                    if (speakers == null) continue;
                    foreach (var kv in speakers)
                    {
                        if (seen.ContainsKey(kv.Key)) continue;
                        seen[kv.Key] = new Dictionary<string, object>
                        {
                            { "id", kv.Key }, { "displayName", Field(kv.Value, "displayName") }, { "username", Field(kv.Value, "username") }, { "lastSession", d.Name },
                        };
                    }
                }
            }

            return new Dictionary<string, object>
            {
                { "players", players.ToArray() },
                { "known", seen.Values.ToArray() },
                { "glossary", File.Exists(GlossaryFile) ? File.ReadAllText(GlossaryFile, Encoding.UTF8) : "" },
            };
        }

        void SavePlayers(object[] list)
        {
            var entries = new List<string>
            {
                "  \"_huong_dan\": " + json.Serialize("Sửa trong STT Bot, mục Chiến dịch. Key là Discord User ID. role: dm | player."),
            };
            var ids = new HashSet<string>();
            foreach (var item in list ?? new object[0])
            {
                var id = Field(item, "id").Trim();
                if (!Regex.IsMatch(id, @"^\d{15,25}$")) throw new UserError("Discord User ID không hợp lệ: " + (id == "" ? "(trống)" : id));
                if (!ids.Add(id)) throw new UserError("Một người bị thêm hai lần: " + id);
                var name = Field(item, "name").Trim();
                if (name == "") throw new UserError("Thiếu tên người chơi cho ID " + id + ".");
                var role = Field(item, "role") == "dm" ? "dm" : "player";
                var character = Field(item, "character").Trim();
                if (role == "dm" && character == "") character = "DM";
                entries.Add("  " + json.Serialize(id) + ": " + json.Serialize(new Dictionary<string, object> { { "name", name }, { "character", character }, { "role", role } }));
            }
            File.WriteAllText(PlayersFile, "{\n" + string.Join(",\n", entries) + "\n}\n", new UTF8Encoding(false));
            Log("Đã lưu danh sách người chơi (" + ids.Count + " người).");
        }

        void SaveGlossary(string text)
        {
            File.WriteAllText(GlossaryFile, text.Replace("\r\n", "\n").Replace("\n", "\r\n"), new UTF8Encoding(false));
            Log("Đã lưu danh sách tên riêng.");
        }

        // ---------- Tiện ích ----------

        void OpenExternal(string url)
        {
            if (url == null || !(url.StartsWith("https://") || url.StartsWith("http://"))) return;
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
            catch (Exception err) { Log("Không mở được trình duyệt: " + err.Message); }
        }

        void OpenPath(string kind)
        {
            string dir = null;
            switch (kind)
            {
                case "sessions": dir = SessionsDir; break;
                case "logs": dir = Path.GetDirectoryName(logFile); break;
                case "app": dir = appDir; break;
                case "env": Process.Start("notepad.exe", "\"" + EnvPath + "\""); return;
            }
            if (dir == null) return;
            Directory.CreateDirectory(dir);
            Process.Start("explorer.exe", "\"" + dir + "\"");
        }
    }
}
