@echo off
title Yomi 2.0 Launcher
cd /d "%~dp0"

echo ========================================================
echo     YOMI 2.0 - Backlit Executive Command HUD
echo ========================================================
echo.

echo [1/3] Starting Python Fast-Engine on port 8765...
start /b "" python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765

timeout /t 2 /nobreak >nul

echo [2/3] Launching Chromium Backlit Frontend...
cd frontend
start /b "" npm run dev -- --host 127.0.0.1 --port 5173

timeout /t 3 /nobreak >nul

echo [3/3] Opening Yomi Standalone Desktop App...
start "" chrome.exe --app=http://127.0.0.1:5173 || start "" http://127.0.0.1:5173

echo.
echo ========================================================
echo   YOMI 2.0 is LIVE! (Press Ctrl+C or close to stop)
echo ========================================================
pause
