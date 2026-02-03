# Hướng dẫn Triển khai NanoClaw trên Ubuntu

Tài liệu này hướng dẫn chi tiết cách cài đặt và chạy NanoClaw trên máy chủ Ubuntu (khuyến nghị 20.04 LTS hoặc mới hơn).

## 1. Cài đặt Môi trường (Node.js & Docker)

NanoClaw yêu cầu Node.js phiên bản mới (v20+) và Docker để chạy các Agent.

### Cài đặt Node.js 20
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt các công cụ cơ bản
sudo apt install -y curl git wget build-essential

# Thêm NodeSource repository cho Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Cài đặt Node.js
sudo apt install -y nodejs

# Kiểm tra phiên bản
node -v
# Output nên là v20.x.x
```

### Cài đặt FFmpeg (Bắt buộc cho Whisper)
Whisper cần FFmpeg để xử lý file âm thanh.

```bash
# Cài đặt FFmpeg
sudo apt install -y ffmpeg

# Kiểm tra
ffmpeg -version
```

### Cài đặt Docker
Cài đặt Docker Engine mới nhất từ repository chính thức của Docker.

```bash
# Cài đặt dependencies cho Docker
sudo apt install -y ca-certificates curl gnupg

# Thêm GPG key của Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Thêm Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cập nhật apt và cài đặt Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Khởi động Docker
sudo systemctl start docker
sudo systemctl enable docker

# Kiểm tra (cần quyền root hoặc thêm user vào group docker)
docker --version
```

## 2. Cài đặt NanoClaw

### Clone Repository
```bash
cd /opt
git clone https://github.com/gavrielc/nanoclaw.git
cd nanoclaw
```

### Cài đặt Dependencies (Host)
```bash
npm install
```

### Build Agent Container
NanoClaw chạy các agent trong container để bảo mật. Bạn cần build image này.

*Lưu ý: Chúng tôi đã thêm các tool Calendar và Google APIs vào container, nên cần build lại.*

```bash
cd container
./build.sh
cd ..
```

## 3. Cấu hình

### Biến Môi trường (.env)
Tạo file `.env` từ file mẫu để cấu hình các key quan trọng.

```bash
cp .env.example .env
nano .env
```

Cập nhật các giá trị sau trong file `.env`:
- `OPENAI_API_KEY`: Key từ OpenAI (bắt buộc để dùng Whisper chuyển giọng nói thành văn bản).
- `TELEGRAM_TOKEN`: Token từ @BotFather (nếu dùng tính năng Telegram).
- `TZ`: Múi giờ (ví dụ: `Asia/Ho_Chi_Minh`).

### Cấu hình WhatsApp
Khi chạy lần đầu, NanoClaw sẽ yêu cầu quét mã QR.

### Cấu hình Google (Gmail & Calendar)

Để sử dụng tính năng Gmail và Calendar, bạn cần cấu hình xác thực Google API. Quá trình này bao gồm 3 bước:

#### Bước 1: Lấy Credentials từ Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một Project mới.
3. Vào **APIs & Services > Library**, tìm và enable 2 API:
   - **Gmail API**
   - **Google Calendar API**
4. Vào **APIs & Services > OAuth consent screen**:
   - Chọn **External**.
   - Điền thông tin ứng dụng (App Name, Email...).
   - Thêm user test là email của bạn (nếu ứng dụng đang ở chế độ Testing).
5. Vào **APIs & Services > Credentials**:
   - Chọn **Create Credentials > OAuth client ID**.
   - Application type: **Desktop app**.
   - Tải file JSON về và đổi tên thành `credentials.json`.

#### Bước 2: Tạo Token (Thực hiện trên máy local của bạn)
Vì server không có trình duyệt để đăng nhập Google, bạn cần tạo token trên máy tính cá nhân (nơi bạn đang dev).

1. Đảm bảo bạn đã cài đặt dependencies:
   ```bash
   npm install
   ```

2. Đặt file `credentials.json` vào thư mục gốc của dự án `nanoclaw`.

3. Chạy script hỗ trợ xác thực:
   ```bash
   npx tsx scripts/setup-google-auth.ts
   ```

4. Làm theo hướng dẫn trên màn hình:
   - Script sẽ tạo ra một đường link.
   - Mở link đó trên trình duyệt, đăng nhập tài khoản Google của bạn.
   - Cấp quyền truy cập.
   - Copy mã xác thực (code) và dán vào terminal.
   - Script sẽ tạo ra file `google-tokens/token.json`.

#### Bước 3: Upload lên Server

1. SSH vào server và tạo thư mục chứa key:
   ```bash
   mkdir -p ~/.gmail-mcp
   mkdir -p ~/.calendar-mcp
   ```

2. Upload file `credentials.json` và `token.json` lên server.
   Bạn có thể dùng `scp` (trên Linux/Mac) hoặc WinSCP (trên Windows).

   **Lưu ý:** Cần copy cả 2 file vào cả 2 thư mục (nếu dùng cả Gmail và Calendar):
   
   *Ví dụ cấu trúc trên server:*
   ```text
   /home/username/.gmail-mcp/
   ├── credentials.json
   └── token.json

   /home/username/.calendar-mcp/
   ├── credentials.json
   └── token.json
   ```

   *Lệnh copy nhanh trên server (sau khi upload vào một chỗ):*
   ```bash
   cp credentials.json ~/.gmail-mcp/
   cp token.json ~/.gmail-mcp/
   cp credentials.json ~/.calendar-mcp/
   cp token.json ~/.calendar-mcp/
   ```

## 4. Chạy Ứng dụng

Sử dụng `pm2` để quản lý process chạy ngầm.

```bash
# Cài đặt pm2
sudo npm install -g pm2

# Build TypeScript code của host
npm run build

# Khởi động NanoClaw
pm2 start dist/index.js --name "nanoclaw"

# Xem log để quét mã QR (cho lần đầu)
pm2 logs nanoclaw
```

## 5. Sử dụng

- Mở WhatsApp, nhắn tin cho số đã kết nối (hoặc Self-chat).
- Gõ: `@Andy help` để bắt đầu.
- Để kiểm tra lịch: `@Andy xem lịch làm việc hôm nay` (Hệ thống sẽ dùng `calendar-cli` đã cài đặt).
