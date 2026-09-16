@echo off
setlocal
cd /d "%~dp0"
title Coffee With Bro

:: Ensure Node is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

:: Run the multi-service runner with dynamic URL detection
node "%~dp0scripts\start-both.js"
