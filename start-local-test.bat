@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 goto npm_missing

if exist "node_modules" goto start_server
echo Installing project dependencies...
call npm install
if errorlevel 1 goto install_failed

:start_server
echo ========================================
echo   Kana Jan Local Test Server
echo ========================================
echo The browser will open automatically.
echo Press Ctrl+C in this window to stop.
call npm run dev -- --open
if errorlevel 1 goto server_failed
exit /b 0

:npm_missing
echo ERROR: npm was not found.
echo Please install Node.js first.
pause
exit /b 1

:install_failed
echo ERROR: npm install failed.
pause
exit /b 1

:server_failed
echo ERROR: dev server failed to start.
pause
exit /b 1
