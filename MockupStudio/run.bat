@echo off
echo ==========================================
echo       SPENDYX MOCKUP STUDIO LAUNCHER
echo ==========================================
echo.
echo [1] Checking for Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python to use this software.
    pause
    exit /b
)

echo [2] Checking dependencies...
python -c "from PIL import Image" >nul 2>&1
if %errorlevel% neq 0 (
    echo [DEBUG] Installing Pillow library...
    pip install Pillow
)

echo [3] Launching Engine...
echo.
python MockupStudioEngine.py
echo.
echo ==========================================
echo      PROCESS COMPLETE - CHECK OUTPUT
echo ==========================================
pause
