# Jinan Inventory & Sales System - Startup Script
Write-Host "==================================" -ForegroundColor Cyan
Write-Host " Jinan Inventory & Sales System" -ForegroundColor Cyan  
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Check if PHP is available
try {
    $phpVersion = php --version
    Write-Host "✓ PHP detected: $phpVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ PHP not found. Please install PHP first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Starting Backend Server (Laravel)..." -ForegroundColor Yellow

# Start Laravel Backend in background
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    php artisan serve --host=0.0.0.0 --port=8000
}

Write-Host "✓ Backend Server starting on: http://localhost:8000" -ForegroundColor Green

Write-Host ""
Write-Host "Starting Frontend Server (React)..." -ForegroundColor Yellow

# Start React Frontend in background
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm start
}

Write-Host "✓ Frontend Server starting on: http://localhost:3000" -ForegroundColor Green

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Application Starting Up..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "🔧 Backend API: http://localhost:8000/api" -ForegroundColor White
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "📧 Admin: admin@example.com / password123" -ForegroundColor White
Write-Host "📧 Sales: sales@example.com / password123" -ForegroundColor White  
Write-Host "📧 Gudang: gudang@example.com / password123" -ForegroundColor White
Write-Host "📧 Finance: finance@example.com / password123" -ForegroundColor White
Write-Host ""

# Wait a moment for servers to start
Write-Host "Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Open browser
Write-Host "Opening application in browser..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✅ Application Started Successfully!" -ForegroundColor Green
Write-Host "✅ Both servers are running in background" -ForegroundColor Green
Write-Host ""
Write-Host "To stop the servers:" -ForegroundColor Yellow
Write-Host "1. Close this PowerShell window, OR" -ForegroundColor White
Write-Host "2. Press Ctrl+C to stop jobs" -ForegroundColor White
Write-Host ""
Write-Host "Server logs are available in the background jobs." -ForegroundColor Cyan
Write-Host ""

# Keep script running to maintain background jobs
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue  
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Green
}
