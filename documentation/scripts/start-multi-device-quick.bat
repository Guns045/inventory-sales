@echo off
title Quick Multi-Device Start
color 0B
echo.
echo ==========================================
echo   Quick Multi-Device Inventory System
echo ==========================================
echo.

:: Quick start without configuration changes
echo Starting Laravel Backend on all interfaces...
start "Laravel Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo Starting Vite Frontend on all interfaces...
start "Vite Frontend" cmd /k "npm run dev"

:: Get local IP for display
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo Waiting for servers to start...
timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo   SERVICES READY!
echo ==========================================
echo.
echo Access from other devices:
echo http://%LOCAL_IP%:3000
echo.
echo Local access:
echo http://localhost:3000
echo.
echo Press any key to exit...
pause >nul