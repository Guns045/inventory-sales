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

Test files are located in the `/tests` directory. These include:

- API endpoint tests
- RBAC functionality tests
- Database integrity checks
- Test data creation scripts

**⚠️ Warning**: Test files are for development only. Do not run in production.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

1. Check the documentation in `/docs`
2. Review test files in `/tests` for examples
3. Check startup scripts in `/scripts` for configuration options

---

**Version**: 1.0.0
**Last Updated**: October 28, 2025