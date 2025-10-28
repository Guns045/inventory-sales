@echo off
title Laravel Backend Server

echo Starting Laravel Backend Server...
echo.
echo Backend will be available at: http://localhost:8000
echo API will be available at: http://localhost:8000/api
echo.
echo Press Ctrl+C to stop the server
echo.

php artisan serve --host=0.0.0.0 --port=8000
