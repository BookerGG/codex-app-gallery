@echo off
setlocal
cd /d "%~dp0"

set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"

"%NODE%" "%~dp0scripts\open-local-gallery.mjs" %*
if errorlevel 1 (
  echo.
  echo The local gallery launcher hit a problem.
  pause
)
