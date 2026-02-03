#!/bin/bash

# NanoClaw Deployment Script for Ubuntu
# Usage: ./deploy.sh

set -e

echo "=== NanoClaw Deployment Script (Ubuntu) ==="

# 1. Check Requirements
echo "[1/5] Checking requirements..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 20..."
    sudo apt update
    sudo apt install -y curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker..."
    sudo apt install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    [ -f /etc/apt/keyrings/docker.gpg ] || curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg not found. Installing FFmpeg..."
    sudo apt update
    sudo apt install -y ffmpeg
fi

if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing PM2..."
    sudo npm install -g pm2
fi

# 2. Install Dependencies
echo "[2/5] Installing dependencies..."
npm install

# 3. Build Container Agent
echo "[3/5] Building Agent Container..."
cd container
./build.sh
cd ..

# 4. Build Host Application
echo "[4/5] Building Host Application..."
npm run build

# 5. Configuration Check
echo "[5/5] Configuration..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  WARNING: Please update .env with your OPENAI_API_KEY and TELEGRAM_TOKEN!"
fi

# 6. Start Application
echo "=== Deployment Complete ==="
echo "To start the application, run:"
echo "pm2 start dist/index.js --name 'nanoclaw'"
echo "To view logs:"
echo "pm2 logs nanoclaw"
