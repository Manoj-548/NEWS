@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed.
    echo Download LTS from https://nodejs.org and run this file again.
    pause
    exit /b 1
)
echo.
echo  AI NEWS STUDIO
echo  Opening http://localhost:3000
echo  Keep this window open. Press Ctrl+C to stop.
echo.
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:3000"
node server.js
pause
