@echo off
echo ==================================
echo Jinan Inventory & Sales System
echo ==================================
echo.
echo Starting Backend Server (Laravel)...
echo.

REM Start Laravel Backend Server
cd /d "%~dp0"
start "Laravel Backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo Backend Server started on: http://localhost:8000
echo.
echo Starting Frontend Server (React)...
echo.

REM Wait a moment for Laravel to start
timeout /t 3 /nobreak >nul

REM Start React Frontend Server
cd frontend
start "React Frontend" cmd /k "npm start"

echo.
echo ==================================
echo Servers Starting Up...
echo.
echo Frontend will be available at: http://localhost:3000
echo Backend API is available at: http://localhost:8000/api
echo.
echo Please wait for both servers to fully start...
echo.

REM Wait for servers to initialize
timeout /t 10 /nobreak >nul

echo.
echo Opening Application in Browser...
start http://localhost:3000

echo.
echo ==================================
echo Application Started Successfully!
echo.
echo Server Windows:
echo - Laravel Backend: Running (Port 8000)
echo - React Frontend: Running (Port 3000)
echo.
echo Test Credentials:
echo - Admin: admin@example.com / password123
echo - Sales: sales@example.com / password123
echo - Gudang: gudang@example.com / password123
echo - Finance: finance@example.com / password123
echo.
echo Press any key to exit this window...
pause >nul
