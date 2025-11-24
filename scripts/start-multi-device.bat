@echo off
title Multi-Device Inventory System Setup
color 0A
echo.
echo ========================================
echo   Multi-Device Inventory System Setup
echo ========================================
echo.

:: Get local IP address
echo Detecting network configuration...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo Local IP Address: %LOCAL_IP%
echo.

:: Check if .env exists
if not exist .env (
    echo Creating .env file from example...
    if exist .env.example (
        copy .env.example .env
    ) else (
        echo ERROR: .env.example file not found!
        pause
        exit /b 1
    )
)

:: Update vite.config.js for network access
echo Updating Vite configuration for network access...
(
echo import { defineConfig } from 'vite';
echo import laravel from 'laravel-vite-plugin';
echo.
echo export default defineConfig^({
echo     plugins: [
echo         laravel^({
echo             input: ['resources/js/app.jsx'],
echo             refresh: true,
echo         }^),
echo     ],
echo     server: {
echo         host: '0.0.0.0',
echo         port: 3000,
echo         cors: true,
echo     },
echo }^);
) > vite.config.js

echo.
echo Configuration completed!
echo.
echo ========================================
echo   STARTING MULTI-DEVICE SERVICES
echo ========================================
echo.

echo Starting Laravel Backend on all interfaces...
start "Laravel Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo Starting Vite Frontend on all interfaces...
start "Vite Frontend" cmd /k "npm run dev"

echo.
echo Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   MULTI-DEVICE SETUP READY!
echo ========================================
echo.
echo Access URLs:
echo - Backend API: http://%LOCAL_IP%:8000
echo - Frontend App: http://%LOCAL_IP%:3000
echo - Local Access: http://localhost:3000
echo.
echo Other devices can connect using:
echo - Frontend: http://%LOCAL_IP%:3000
echo - Backend: http://%LOCAL_IP%:8000
echo.
echo Press any key to open browser...
pause >nul

start http://%LOCAL_IP%:3000

echo.
echo Multi-Device setup is running!
echo - Laravel server: Terminal window "Laravel Backend"
echo - Vite server: Terminal window "Vite Frontend"
echo.
echo Press any key to exit this setup...
pause >nul