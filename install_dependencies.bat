@echo off
title Yomi 2.0 Dependencies Installer
cd /d "%~dp0"

echo ========================================================
echo   Installing YOMI 2.0 Backend & Frontend Dependencies
echo ========================================================
echo.

echo [1/2] Installing Python backend packages...
pip install -r backend/requirements.txt

echo.
echo [2/2] Installing Frontend npm packages...
cd frontend
call npm install

echo.
echo ========================================================
echo   Installation Complete! You can now run run_yomi.bat
echo ========================================================
pause
