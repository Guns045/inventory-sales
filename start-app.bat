@echo off
echo Starting Inventory Management System...
echo.

REM Start Laravel server in a new window
start "Laravel Server" cmd /k "cd /d C:\xampp\htdocs\jinan-inventory && php artisan serve --host=127.0.0.1 --port=8000"

REM Wait a bit for Laravel to start
timeout /t 5 /nobreak >nul

REM Start React server in another window
start "React Server" cmd /k "cd /d C:\xampp\htdocs\jinan-inventory\frontend && npm start"

REM Wait for servers to initialize
timeout /t 10 /nobreak >nul

REM Open the browser to the React app (which will show the login page)
start http://localhost:3000

echo.
echo Servers started successfully!
echo - Laravel backend: http://127.0.0.1:8000
echo - React frontend: http://localhost:3000
echo - Login page will open in your default browser
echo.
echo Press Ctrl+C in both command windows to stop the servers.