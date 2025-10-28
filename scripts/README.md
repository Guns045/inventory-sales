# Startup Scripts

This directory contains scripts to help you start the Inventory Management System.

## Windows Batch Files

### Main Startup Scripts
- `start-app.bat` - Main application startup script (starts both backend and frontend)
- `start-simple.bat` - Simplified startup with basic configuration
- `start-backend.bat` - Starts only the Laravel backend server
- `start-frontend.bat` - Starts only the React frontend server
- `start-laravel.bat` - Alternative Laravel backend startup

### PowerShell Script
- `Start-Application.ps1` - PowerShell version of the startup script

## Usage

### Option 1: Main Application (Recommended)
```bash
scripts/start-app.bat
```
This will start both the Laravel backend (port 8000) and React frontend (port 3000).

### Option 2: Simple Startup
```bash
scripts/start-simple.bat
```
Uses basic configuration for quick testing.

### Option 3: Individual Services
```bash
# Start backend only
scripts/start-backend.bat

# Start frontend only (in separate terminal)
scripts/start-frontend.bat
```

### Option 4: PowerShell (Windows PowerShell)
```powershell
.\scripts\Start-Application.ps1
```

## Default Access URLs

After starting the application:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/documentation

## Test Credentials

- **Admin**: admin@example.com / password
- **Sales**: sales@example.com / password
- **Gudang**: gudang@example.com / password
- **Finance**: finance@example.com / password

## Prerequisites

- PHP 8.1+
- Composer
- Node.js 16+
- npm/yarn
- XAMPP/WAMP/Laravel Valet (for local development)

## Troubleshooting

1. **Port already in use**: The scripts will automatically detect and use alternative ports
2. **Permission denied**: Run Command Prompt as Administrator
3. **Dependencies missing**: Run `composer install` and `npm install` first
4. **Database issues**: Ensure MySQL is running and database is configured in `.env`