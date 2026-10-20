# STT Bot Discord cho D&D

Bot ngồi trong kênh voice Discord, ghi âm riêng từng người, chuyển thành chữ bằng **faster-whisper** chạy trên GPU của máy, rồi dùng **Claude Code** (gói Pro, không tốn tiền API) để biên tập transcript và viết recap.

```
[Lúc chơi]  /record start ──► bot ghi mỗi lượt nói thành 1 file .ogg trong sessions/<mã>/audio/
[Sau buổi]  /record stop  ──► faster-whisper (GPU) ──► transcript_raw.md
                          ──► claude -p ──► transcript_clean.md, recap.md, notes.md
                          ──► bot đăng recap + file lên kênh text
```

## Cài đặt (một lần)

### 1. Tạo bot trên Discord
1. Vào https://discord.com/developers/applications, bấm **New Application**, đặt tên (vd. "Biên Niên Ký").
2. Tab **General Information**: copy **Application ID**.
3. Tab **Bot**: bấm **Reset Token**, copy token. Không cần bật Privileged Intents nào.
4. Tab **OAuth2 → URL Generator**: tick scope `bot` và `applications.commands`. Ở Bot Permissions, tick `View Channels`, `Send Messages`, `Attach Files`, `Connect`, `Speak`. Mở link ở cuối trang để mời bot vào server.
5. Trong Discord, bật **Settings → Advanced → Developer Mode**, rồi chuột phải tên server → **Copy Server ID**.

### 2. Cài thư viện
Mở PowerShell trong thư mục project:

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Script sẽ cài thư viện Node, tạo `stt\.venv` chứa faster-whisper và thư viện CUDA (khoảng 2GB), tải model Whisper, rồi tạo `.env`, `config\players.json` và `config\glossary.txt` từ file mẫu.

Yêu cầu: Windows, Node.js 22.12+, Python 3.10+, GPU NVIDIA (khuyên dùng, chạy được trên RTX 3050 4GB), Claude Code đã đăng nhập.

> PowerShell trên máy này đang chặn chạy `npm.ps1`, nên các lệnh bên dưới dùng `npm.cmd`.

### 3. Cấu hình
- `.env`: điền `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`. Có thể điền thêm `DM_ROLE_ID` để chỉ DM được bật/tắt ghi âm.
- `config\players.json`: map Discord User ID sang tên người chơi và nhân vật. Chuột phải tên người dùng → **Copy User ID**.
- `config\glossary.txt` (setup tạo từ `glossary.example.txt`, không commit lên git để người chơi không đọc trước được): tên NPC, địa danh, thần, phe phái... Danh sách càng đầy đủ thì Whisper và Claude nhận đúng tên riêng càng nhiều. Sau mỗi buổi, xem mục "Tên riêng cần kiểm tra" trong `notes.md` để bổ sung.
- Claude Code phải đăng nhập bằng tài khoản Pro: chạy `claude` một lần trong terminal và `/login` nếu được hỏi.

### 4. Đăng ký lệnh và chạy bot
```powershell
npm.cmd run deploy-commands
npm.cmd start
```

## Dùng trong buổi chơi

| Lệnh | Việc |
|---|---|
| `/record start` | Bot vào kênh voice bạn đang ngồi và bắt đầu ghi. Bot thông báo công khai trong kênh. |
| `/record status` | Xem đã ghi bao lâu, bao nhiêu đoạn, những ai đã nói. |
| `/record stop` | Dừng ghi, rời kênh, xử lý rồi đăng recap. Thêm `process:False` nếu muốn để xử lý sau. |
| `/process session:<mã>` | Chạy lại STT + LLM cho một session (bỏ trống = session mới nhất). |
| `/optout` / `/optin` | Người chơi tự tắt/bật việc ghi giọng của mình. |

Xử lý bằng tay, không cần bot:
```powershell
npm.cmd run process                       # cả STT + LLM, session mới nhất
npm.cmd run stt -- 2026-10-20_2000        # chỉ STT
npm.cmd run llm -- 2026-10-20_2000        # chỉ LLM
```
Cả hai bước đều có cache. Nếu bị ngắt giữa chừng, chạy lại sẽ làm tiếp từ chỗ dừng. Muốn LLM viết lại recap thì xoá `recap.md` (hoặc thư mục `llm_cache/`) rồi chạy lại.

## Kết quả mỗi session (`sessions/<mã>/`)
- `audio/*.ogg`: audio gốc, mỗi lượt nói một file, tên file là `<mili-giây từ đầu buổi>_<userId>.ogg`
- `transcript_raw.md`: transcript máy nhận dạng, chưa sửa
- `transcript_clean.md`: đã sửa lỗi, bỏ từ đệm, gắn nhãn `[IC]` (trong vai) / `[OOC]` (ngoài lề)
- `recap.md`: recap dạng truyện kể cho cả nhóm đọc
- `notes.md`: ghi chú cho DM gồm NPC, địa điểm, quest, loot, combat, quyết định, phán quyết luật

## Tinh chỉnh
- **Độ chính xác STT**: trong `.env` đổi `WHISPER_MODEL=large-v3`. Bản này chính xác hơn, chậm hơn khoảng 2 lần và dùng khoảng 3GB VRAM.
- **Giọng văn recap**: sửa thẳng các file trong `prompts/`.
- **Cắt đoạn**: `SILENCE_MS` là thời gian im lặng để cắt sang đoạn mới. Ai hay ngắt quãng khi nói thì tăng lên 1500–2000.
- **Hết hạn mức Claude Pro**: đợi hạn mức hồi lại rồi chạy `npm.cmd run llm`, cache sẽ giữ phần đã làm. Hoặc đặt `LLM_PROVIDER=gemini` nếu đã cài và đăng nhập Gemini CLI.

## Lưu ý
- Bot chỉ ghi khi có lệnh `/record start` và luôn thông báo công khai trong kênh. Hãy xin phép cả nhóm trước khi dùng.
- Audio và transcript chỉ lưu trên máy này. Phần transcript sẽ được gửi cho Claude để biên tập.
- `claude -p` dùng gói Pro cho mục đích cá nhân. Nếu sau này bot phục vụ nhiều server hay người khác thì nên chuyển sang API key.
