@echo off
setlocal
cd /d "%~dp0"
title Order Gamma
where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js was not found. Run the "Order Gamma - Setup" icon first.
  pause
  exit /b 1
)

curl -s http://127.0.0.1:11434/api/tags >nul 2>nul || start "" /min ollama serve

set PORT=3000
curl -s http://127.0.0.1:%PORT%/api/info >nul 2>nul
if not errorlevel 1 (
  echo  Order Gamma is already running. Opening it...
  start "" http://localhost:%PORT%
  exit /b 0
)

echo.
echo  Starting Order Gamma at http://localhost:%PORT%
echo  Keep this window open while you use the app. Close it to stop.
echo.
start "" /b powershell -NoProfile -Command "Start-Sleep 2; Start-Process 'http://localhost:3000'"
node server.js
pause
