# Báo cáo Nâng cấp Hệ thống NanoClaw AI

## 1. Tổng quan
Hệ thống AI Assistant (NanoClaw) đã được nâng cấp để phục vụ nhu cầu của một chuyên gia AI/Lập trình viên thường xuyên di chuyển. Hệ thống tập trung vào tính bảo mật (chạy trong Container), khả năng mở rộng (Module hóa) và hỗ trợ tiếng Việt.

## 2. Các thay đổi đã thực hiện

### 2.1. Ngôn ngữ & Persona
- **Cấu hình:** Đã cập nhật `groups/main/CLAUDE.md`.
- **Thay đổi:** Thiết lập persona mặc định là Trợ lý AI nói tiếng Việt, phong cách chuyên nghiệp, súc tích.
- **Tác dụng:** Mọi phản hồi từ AI sẽ ưu tiên tiếng Việt, phù hợp với yêu cầu "đọc chủ yếu bằng tiếng Việt".

### 2.2. Tích hợp Công cụ (Tools)
Đã thêm các khả năng mới vào Container Agent:

1.  **Google Calendar (Mới):**
    -   **Module:** `container/agent-runner/src/tools/calendar-cli.ts`
    -   **Chức năng:** Xem lịch (`list`), Thêm sự kiện (`add`).
    -   **Cơ chế:** Chạy dưới dạng CLI tool trong container, sử dụng OAuth token được mount từ host.

2.  **Gmail (Có sẵn):**
    -   Sử dụng skill `add-gmail` có sẵn của NanoClaw.
    -   Cần cấu hình OAuth theo hướng dẫn trong `SKILL.md`.

3.  **Tin tức & Tra cứu (Web Browsing):**
    -   Tận dụng `agent-browser` (đã có sẵn trong container).
    -   Đã thêm hướng dẫn vào `CLAUDE.md` để AI biết cách tự động truy cập các trang tin tức (VnExpress, Google News) và tóm tắt.

### 2.3. Tích hợp Đa phương thức & Đa kênh (Mới)
1.  **Speech-to-Text (Whisper):**
    -   **Module:** `src/transcribe.ts`
    -   **Chức năng:** Tự động chuyển đổi tin nhắn thoại (WhatsApp/Telegram) thành văn bản tiếng Việt.
    -   **Công nghệ:** OpenAI Whisper API (yêu cầu `OPENAI_API_KEY`).
    -   **Hỗ trợ:** Xử lý file OGG/MP3, tự động nhận diện ngôn ngữ.

2.  **Telegram Bot:**
    -   **Skill:** `/add-telegram`
    -   **Chức năng:** Cho phép tương tác với Agent qua Telegram song song với WhatsApp.
    -   **Cấu hình:** Thêm `TELEGRAM_TOKEN` vào biến môi trường.

### 2.4. Hạ tầng & Triển khai
- **Hệ điều hành:** Ubuntu (thay thế CentOS 7).
- **Giải pháp:** Sử dụng Docker để đảm bảo tính tương thích.
- **Tự động hóa:** Đã tạo script `deploy.sh` để cài đặt toàn bộ dependencies (Node.js, Docker, FFmpeg) và build ứng dụng chỉ với 1 lệnh.
- **Tài liệu:** Đã tạo `docs/UBUNTU_DEPLOY.md` thay thế cho tài liệu CentOS cũ.

## 3. Hướng dẫn sử dụng

### 3.1. Cài đặt ban đầu
1.  Copy `deploy.sh` lên server và chạy: `chmod +x deploy.sh && ./deploy.sh`
2.  Cấu hình file `.env` (theo mẫu `.env.example`).
3.  Làm theo file `docs/UBUNTU_DEPLOY.md` để xác thực Google (OAuth).

### 3.2. Ra lệnh cho AI (Ví dụ)
- **Voice:** Gửi tin nhắn thoại trực tiếp qua WhatsApp/Telegram. AI sẽ nghe và phản hồi bằng văn bản.
- **Kiểm tra lịch:** "Hôm nay tôi có lịch gì không?"
- **Lên lịch:** "Lên lịch họp với team AI vào 10h sáng mai trong 1 tiếng."
- **Đọc tin:** "Tóm tắt 5 tin tức AI nổi bật nhất sáng nay từ Google News."
- **Gửi mail:** "Gửi email cho anh Nam báo cáo tiến độ dự án NanoClaw."

## 4. Khuyến nghị phát triển tiếp theo
- **Voice Response:** Hiện tại AI chỉ "nghe" được. Có thể tích hợp Text-to-Speech (TTS) để AI "nói" lại.
- **Database:** Cân nhắc chuyển từ JSON file sang SQLite/PostgreSQL nếu dữ liệu tin nhắn quá lớn.
