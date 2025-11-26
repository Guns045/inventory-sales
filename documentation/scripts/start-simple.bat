@echo off
cls
title Jinan Inventory System - Startup

echo ==================================
echo   Jinan Inventory & Sales System
echo ==================================
echo.

:: Check if we're in the right directory
if not exist "artisan" (
    echo Error: Please run this script from the project root directory
    echo where 'artisan' file is located
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo Error: frontend folder not found
    pause
    exit /b 1
)

echo Checking requirements...
echo.

:: Check PHP
php --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PHP is not installed or not in PATH
    echo Please install PHP first: https://www.php.net/downloads.php
    pause
    exit /b 1
)
echo [OK] PHP found

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js first: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo Starting Backend Server...
start "Laravel Backend" cmd /c "php artisan serve --host=0.0.0.0 --port=8000"

echo Backend starting on http://localhost:8000
echo.

echo Starting Frontend Server...
cd frontend
start "React Frontend" cmd /c "npm start"

echo Frontend starting on http://localhost:3000
echo.

echo ==================================
echo     Starting Application...
echo ==================================
echo.
echo Please wait for servers to fully load...
echo Opening browser in 10 seconds...
echo.

ping localhost -n 10 > nul

start http://localhost:3000

echo.
echo ==================================
echo   Application Started Successfully!
echo ==================================
echo.
echo Access URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000/api
echo.
echo Test Accounts:
echo   Admin   : admin@example.com / password123
echo   Sales   : sales@example.com / password123
echo   Gudang  : gudang@example.com / password123
echo   Finance : finance@example.com / password123
echo.
echo Server windows are running in background.
echo Close this window to stop all servers.
echo.
pause
