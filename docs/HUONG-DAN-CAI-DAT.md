# Hướng dẫn cài STT Bot cho DM

STT Bot ghi âm buổi chơi D&D trên Discord, chuyển thành chữ và tự viết recap. Bạn không cần biết lập trình, chỉ cần làm theo các bước dưới đây. Mất khoảng 10 phút thao tác, cộng thêm thời gian chờ tải.

## Cần chuẩn bị

- Máy tính Windows 10 hoặc 11, 64-bit.
- Quyền **Quản lý server** trong server Discord của nhóm (để mời bot vào).
- Nên có: card đồ hoạ NVIDIA. Không có thì vẫn chạy, chỉ chậm hơn.
- Nên có: gói **Claude Pro** để bot tự viết recap. Không có thì bot chỉ làm transcript.
- Khoảng 6GB ổ cứng trống.

## 1. Tải và cài

1. Vào trang [Releases](https://github.com/Buim1nh/stt-bot-discord/releases/latest), tải file `STTBot-Setup-x.y.z.exe`.
2. Mở file vừa tải. Nếu Windows hiện cửa sổ xanh "Windows protected your PC", bấm **More info** rồi **Run anyway**. Cảnh báo này xuất hiện vì bộ cài chưa được ký số, không phải do có virus.
3. Bấm **Next** cho tới khi xong. Bộ cài không hỏi quyền admin.
4. Mở **STT Bot DnD** từ Desktop hoặc menu Start.

## 2. Làm theo trình hướng dẫn trong app

Lần đầu mở app, trình hướng dẫn sẽ dẫn bạn qua từng bước.

**Tạo bot Discord.** Bấm link Discord Developer Portal trong app, đăng nhập Discord, bấm **New Application** rồi đặt tên. Chọn tab **Bot** ở menu trái, bấm **Reset Token** rồi **Copy**. Quay lại app, dán token vào ô và bấm **Kiểm tra token**.

> Token giống như mật khẩu của bot. Đừng gửi cho ai và đừng dán lên kênh chat.

**Mời bot vào server.** Bấm **Mời bot**, chọn server của nhóm trên trang Discord rồi bấm **Authorize**. Quay lại app, server sẽ tự hiện ra. Chọn nó rồi bấm **Lưu và tiếp tục**.

**Cài thành phần.**
- *Nhận dạng giọng nói*: bấm **Cài đặt**. App sẽ tải khoảng 4GB (2GB nếu máy không có card NVIDIA), mất 10 đến 30 phút. Trong lúc đó bạn vẫn dùng app bình thường được, nhưng đừng tắt app.
- *Claude viết recap*: bấm **Cài đặt**, một cửa sổ đen sẽ mở ra và tự cài. Xong thì bấm **Đăng nhập** và đăng nhập tài khoản Claude của bạn trên trình duyệt.

**Xong.** Bấm **Bật bot ngay**.

## 3. Mỗi buổi chơi

1. Mở app, bấm nút tròn lớn để **bật bot**. Đợi tới khi thấy chữ "Bot đang trực tuyến".
2. Vào kênh voice của nhóm, gõ `/record start` trong Discord. Bot sẽ vào kênh và báo cho cả nhóm biết là đang ghi.
3. Hết buổi gõ `/record stop`. Vài phút sau bot sẽ đăng recap và các file vào kênh chat.
4. Ai không muốn bị ghi giọng thì tự gõ `/optout`. Gõ `/optin` để bật lại.

Đọc lại recap, ghi chú DM và transcript của các buổi cũ ở mục **Buổi chơi** trong app.

## 4. Để recap ghi đúng tên

Vào mục **Chiến dịch** trong app:
- **Người chơi**: sau buổi ghi âm đầu tiên, những người đã nói sẽ hiện ra. Bấm vào tên để thêm, rồi điền tên người chơi và tên nhân vật. Transcript sẽ ghi "Thorin (Minh)" thay vì tên Discord.
- **Tên riêng**: liệt kê tên NPC, địa danh, thần, phe phái, mỗi dòng một tên. Danh sách càng đủ thì bot càng nhận đúng tên.

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| App báo thiếu WebView2 | Bấm OK để mở trang tải, cài xong mở lại app. |
| "Token không đúng" | Vào Developer Portal, tab Bot, bấm Reset Token và copy lại token mới. |
| Không thấy lệnh `/record` trong Discord | Tắt rồi bật lại bot trong app, đợi khoảng 1 phút rồi khởi động lại Discord. |
| Cài nhận dạng giọng nói bị lỗi | Kiểm tra mạng rồi bấm **Thử lại**. Phần đã tải không phải tải lại. |
| Bot không viết recap | Kiểm tra thẻ Claude ở Tổng quan đã báo "Đã đăng nhập" chưa. Có thể gói Pro đã hết hạn mức, đợi vài giờ rồi mở buổi đó trong mục **Buổi chơi** và bấm xử lý lại. |
| Lỗi khác | Vào mục **Nhật ký**, bấm **Mở file nhật ký** và gửi file `STTBot.log` cho người hỗ trợ. |

## Gỡ cài đặt

Vào **Settings → Apps → Installed apps**, tìm **STT Bot DnD** và bấm **Uninstall**. Phần tải về (Python, model) sẽ bị xoá. Các buổi đã ghi trong thư mục `sessions` và file cấu hình được giữ lại, muốn xoá hẳn thì xoá thư mục `%LOCALAPPDATA%\Programs\STTBotDnD`.

## Lưu ý về quyền riêng tư

Audio và transcript chỉ nằm trên máy bạn. Riêng phần transcript sẽ được gửi cho Claude để biên tập nếu bạn bật tính năng viết recap. Hãy xin phép cả nhóm trước khi ghi âm.
