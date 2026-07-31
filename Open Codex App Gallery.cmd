@echo off
setlocal
cd /d "%~dp0"

set "PORT=30730"
start "Codex App Gallery Local Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0scripts\open-local-gallery.ps1" -Port %PORT%

timeout /t 7 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/"
