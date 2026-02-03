@echo off
echo Stopping all Node.js processes...
taskkill /F /IM node.exe
echo Done. Please restart NanoClaw with 'npm run dev'
pause
