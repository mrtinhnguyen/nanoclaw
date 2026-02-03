# Hướng dẫn Triển khai NanoClaw trên CentOS 7

Tài liệu này hướng dẫn chi tiết cách cài đặt và chạy NanoClaw trên máy chủ CentOS 7.

## Lưu ý Quan trọng
CentOS 7 đã kết thúc hỗ trợ (EOL) vào tháng 6/2024. Bạn nên cân nhắc nâng cấp lên AlmaLinux 9 hoặc Rocky Linux 9. Tuy nhiên, nếu bắt buộc dùng CentOS 7, hãy làm theo hướng dẫn sau.

## 1. Cài đặt Môi trường (Node.js & Docker)

NanoClaw yêu cầu Node.js phiên bản mới (v20+) và Docker để chạy các Agent.

### Cài đặt Node.js 20
```bash
# Cập nhật hệ thống
sudo yum update -y

# Cài đặt các công cụ cơ bản
sudo yum install -y curl git wget

# Thêm NodeSource repository cho Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Cài đặt Node.js
sudo yum install -y nodejs

# Kiểm tra phiên bản
node -v
# Output nên là v20.x.x
```

### Cài đặt FFmpeg (Bắt buộc cho Whisper)
Whisper cần FFmpeg để xử lý file âm thanh.

```bash
# Cài đặt EPEL release
sudo yum install -y epel-release

# Nhập GPG key
sudo rpm -v --import http://li.nux.ro/download/nux/RPM-GPG-KEY-nux.ro

# Cài đặt Nux Dextop repository
sudo rpm -Uvh http://li.nux.ro/download/nux/dextop/el7/x86_64/nux-dextop-release-0-5.el7.nux.noarch.rpm

# Cài đặt FFmpeg
sudo yum install -y ffmpeg ffmpeg-devel

# Kiểm tra
ffmpeg -version
```

### Cài đặt Docker
Trên CentOS 7, phiên bản Docker mặc định có thể quá cũ. Hãy cài Docker CE.

```bash
# Gỡ bỏ phiên bản cũ (nếu có)
sudo yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

# Cài đặt yum-utils
sudo yum install -y yum-utils

# Thêm Docker repo
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Cài đặt Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io

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
Để sử dụng tính năng Gmail và Calendar, bạn cần file `credentials.json` và `token.json` từ Google Cloud Console.

1. Tạo thư mục chứa key trên server:
```bash
mkdir -p ~/.gmail-mcp
mkdir -p ~/.calendar-mcp
```

2. Upload file `credentials.json` và `token.json` (đã xác thực từ máy local của bạn) lên các thư mục trên.
   *Lưu ý: Do server không có trình duyệt, bạn nên chạy script xác thực trên máy cá nhân rồi copy file token lên server.*

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
