@echo off
set PATH=C:\Program Files\nodejs;%PATH%
set DATABASE_URL=file:./dev.db
set NEXTAUTH_URL=http://localhost:3000
set NEXTAUTH_SECRET=dev-secret-key-change-in-production-1234567890
set UPLOAD_DIR=./uploads
cd /d "%~dp0"
echo Starting BgRemover...
echo.
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop
echo.
node node_modules/next/dist/bin/next dev -p 3000
pause
