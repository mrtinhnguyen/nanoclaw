#!/bin/bash

# NanoClaw Deployment Script for CentOS 7
# Usage: ./deploy.sh

set -e

echo "=== NanoClaw Deployment Script ==="

# 1. Check Requirements
echo "[1/5] Checking requirements..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 20..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
fi

if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker..."
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo yum install -y docker-ce docker-ce-cli containerd.io
    sudo systemctl start docker
    sudo systemctl enable docker
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg not found. Installing FFmpeg..."
    sudo yum install -y epel-release
    sudo rpm -v --import http://li.nux.ro/download/nux/RPM-GPG-KEY-nux.ro
    sudo rpm -Uvh http://li.nux.ro/download/nux/dextop/el7/x86_64/nux-dextop-release-0-5.el7.nux.noarch.rpm
    sudo yum install -y ffmpeg ffmpeg-devel
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
