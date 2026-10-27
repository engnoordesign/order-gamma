@echo off
setlocal
cd /d "%~dp0"
title Order Gamma - Setup
echo.
echo  ===== Order Gamma setup =====
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is missing. Installing it with winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  echo.
  echo  Node.js was installed. Please CLOSE this window and run Setup again.
  pause
  exit /b 0
)
echo  [ok] Node.js found

where ollama >nul 2>nul
if errorlevel 1 (
  echo  Ollama is missing. Installing it with winget...
  winget install -e --id Ollama.Ollama --accept-package-agreements --accept-source-agreements
  echo.
  echo  Ollama was installed. Please CLOSE this window and run Setup again.
  pause
  exit /b 0
)
echo  [ok] Ollama found

curl -s http://127.0.0.1:11434/api/tags >nul 2>nul || start "" /min ollama serve
powershell -NoProfile -Command "for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod http://127.0.0.1:11434/api/tags | Out-Null;exit 0}catch{Start-Sleep 2}};exit 1"
if errorlevel 1 (
  echo  [!] Ollama did not start. Open the Ollama app, then run Setup again.
  pause
  exit /b 1
)

ollama list | findstr /i "qwen2.5vl:7b" >nul
if errorlevel 1 (
  echo  Downloading the vision model qwen2.5vl:7b ^(about 6 GB, one time^)...
  ollama pull qwen2.5vl:7b
  if errorlevel 1 (
    echo  [!] Model download failed. Check your internet and run Setup again.
    pause
    exit /b 1
  )
)
echo  [ok] Vision model ready

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-shortcuts.ps1"
echo.
echo  Setup finished. Use the "Order Gamma" icon on your Desktop to start the app.
echo.
pause
