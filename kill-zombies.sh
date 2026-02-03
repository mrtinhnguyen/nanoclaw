#!/bin/bash
echo "Stopping NanoClaw processes..."

# Stop PM2 process if exists
if command -v pm2 &> /dev/null; then
    pm2 stop nanoclaw 2>/dev/null || true
fi

# Kill any lingering node processes running nanoclaw
# Matches "node dist/index.js" or "tsx src/index.ts"
pkill -f "dist/index.js" || true
pkill -f "src/index.js" || true
pkill -f "nanoclaw" || true

# Kill potential zombie agent containers
if command -v docker &> /dev/null; then
    echo "Stopping zombie containers..."
    docker ps -q --filter ancestor=nanoclaw-agent | xargs -r docker stop
fi

echo "Done. You can restart with 'pm2 start nanoclaw'"
