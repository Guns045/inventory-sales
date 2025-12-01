# Inventory Management System

A comprehensive inventory and sales management system built with Laravel (backend) and React (frontend), featuring Role-Based Access Control (RBAC).

## Features

### 🏗️ Architecture
- **Backend**: Laravel 9.x with API routes
- **Frontend**: React 18 with Bootstrap 5
- **Database**: MySQL with Eloquent ORM
- **Authentication**: Laravel Sanctum
- **Authorization**: Role-Based Access Control (RBAC)

### 👥 User Roles & Permissions
- **Admin**: Full system access and user management
- **Sales**: Quotations, sales orders, customer management
- **Gudang**: Stock management and order fulfillment
- **Finance**: Invoicing and financial reporting

### 📦 Core Features
- **Product Management**: Categories, stock tracking, pricing
- **Sales Management**: Quotations → Sales Orders → Invoices workflow
- **Inventory Control**: Stock movements, low stock alerts
- **Approval System**: Multi-level quotation approval
- **Reporting**: Sales, inventory, and financial reports
- **PDF Generation**: Quotations and invoices in PDF format

## Quick Start

### Prerequisites
- PHP 8.1+
- Composer
- Node.js 16+
- MySQL 5.7+ or 8.0+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jinan-inventory
   ```

2. **Install dependencies**
   ```bash
   composer install
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

   Configure your database in `.env` file.

4. **Database setup**
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

### Running the Application

#### Option 1: Use startup script (Recommended)
```bash
# Windows
scripts/start-app.bat

# PowerShell
.\scripts\Start-Application.ps1
```

#### Option 2: Manual startup
```bash
# Terminal 1 - Backend
php artisan serve

# Terminal 2 - Frontend
npm start
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password |
| Sales | sales@example.com | password |
| Gudang | gudang@example.com | password |
| Finance | finance@example.com | password |

## Project Structure

```
jinan-inventory/
├── app/                    # Laravel application code
│   ├── Http/Controllers/   # API controllers
│   ├── Models/             # Eloquent models
│   └── ...
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── ...
├── database/              # Database migrations and seeders
├── routes/                # API and web routes
├── docs/                  # Documentation
├── scripts/               # Startup and utility scripts
├── tests/                 # Test files and utilities
└── ...
```

## API Documentation

Comprehensive API documentation is available in `docs/API-Documentation.md` or by accessing `/api/documentation` when the backend is running.

## Role-Based Access Control (RBAC)

The system implements a comprehensive RBAC system with:

- **4 User Roles**: Admin, Sales, Gudang, Finance
- **Granular Permissions**: Resource-based permissions (read, create, update, delete)
- **Dynamic UI**: Role-based sidebar and menu visibility
- **Secure API**: Server-side permission validation

Detailed RBAC documentation is available in `docs/RBAC_DOCUMENTATION.md`.

## Testing

### Local Development Testing
Test files are located in the `/tests` directory. These include:

- API endpoint tests
- RBAC functionality tests
- Database integrity checks
- Test data creation scripts

**⚠️ Warning**: Test files are for development only. Do not run in production.

### Multi-Device Testing

For testing the application across multiple devices (mobile, tablet, other computers) on your local network:

📖 **Quick Setup:** See `docs/QUICK_START_MULTI_DEVICE.md`

📚 **Complete Guide:** See `docs/MULTI_DEVICE_SETUP.md`

**Quick Start:**
1. Get your local IP: `ipconfig | findstr "IPv4"`
2. Edit `vite.config.js`: Set `host: '0.0.0.0'`
3. Restart servers:
   ```bash
   php artisan serve --host=YOUR_IP --port=8000
   npm run dev
   ```
4. Access from other devices: `http://YOUR_IP:3000`

## Deployment Guide

### 1. Production Build
To prepare the application for production, you need to build the frontend assets:

```bash
npm run build
```
This command compiles the React assets into the `public/build` directory.

### 2. Server Requirements
- **Web Server**: Apache or Nginx
- **PHP**: 8.1 or higher
- **Database**: MySQL 5.7+ or 8.0+
- **Composer**: Latest version
- **Node.js**: 16+ (for building assets)

### 3. Deployment Steps

#### A. Clone & Install
```bash
git clone <repository-url>
cd jinan-inventory
composer install --optimize-autoloader --no-dev
npm install
npm run build
```

#### B. Environment Configuration
1. Copy `.env.example` to `.env`
2. Update database credentials:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=your_db_name
   DB_USERNAME=your_db_user
   DB_PASSWORD=your_db_password
   ```
3. Set application environment:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://your-domain.com
   ```
4. Generate application key:
   ```bash
   php artisan key:generate
   ```

#### C. Database Setup
```bash
php artisan migrate --force
php artisan db:seed --force
```

#### D. File Permissions
Ensure the web server (e.g., `www-data`) has write access to storage and cache directories:
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### E. Web Server Configuration (Apache Example)
Ensure your VirtualHost points to the `public` directory:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/jinan-inventory/public

    <Directory /var/www/jinan-inventory/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### 4. Troubleshooting
- **403 Forbidden**: Check file permissions for `storage` and `bootstrap/cache`.
- **500 Internal Server Error**: Check `storage/logs/laravel.log`.
- **Assets 404**: Ensure `npm run build` was executed and `public/build` exists.

---

**Version**: 1.0.1
**Last Updated**: December 02, 2025