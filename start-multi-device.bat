@echo off
title Multi-Device Inventory System
color 0A
echo Starting Multi-Device Inventory System...
echo.

start "Laravel Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"
start "Vite Frontend" cmd /k "npm run dev"

echo.
echo Servers starting...
echo Backend: http://192.168.18.23:8000
echo Frontend: http://192.168.18.23:3000
echo.
echo Access from other devices using: http://192.168.18.23:3000
echo.
pause