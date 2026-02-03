#!/bin/bash
# Kill all node processes on Linux/Ubuntu to handle zombie processes/conflicts
echo "Stopping all Node.js processes..."
pkill -f node
echo "Done. Please restart NanoClaw."
