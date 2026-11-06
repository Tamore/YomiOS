@echo off
title Yomi Launcher
cd /d "%~dp0"

echo ========================================================
echo     Yomi - Executive Command HUD
echo ========================================================
echo.

echo [1/3] Starting Python Fast-Engine on port 8765...
start "Yomi Engine" /min cmd /c "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765"

timeout /t 2 /nobreak >nul

echo [2/3] Launching Vite Frontend on port 5173...
start "Yomi Frontend" /min cmd /c "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul

echo [3/3] Opening Yomi App...
start "" chrome.exe --app=http://127.0.0.1:5173 2>nul || start "" http://127.0.0.1:5173

echo.
echo ========================================================
echo   Yomi is LIVE at http://127.0.0.1:5173
echo ========================================================
pause
