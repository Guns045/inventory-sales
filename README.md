# Inventory Management System

A robust, enterprise-grade Inventory and Sales Management System built with **Laravel** (Backend) and **React** (Frontend). Designed for high performance, scalability, and ease of use, featuring comprehensive Role-Based Access Control (RBAC) and real-time stock tracking.

## 🚀 Features

### 🏗️ Core Architecture
- **Backend**: Laravel 10.x API
- **Frontend**: React 18 (Vite) + Tailwind CSS
- **Database**: MySQL 8.0+
- **Authentication**: Laravel Sanctum (Secure Token-Based)
- **State Management**: React Context API + Custom Hooks

### 📦 Inventory & Stock Management
- **Multi-Warehouse Support**: Manage stock across multiple locations.
- **Real-time Stock Tracking**: Automatic stock deduction upon shipment.
- **Stock Movements**: Detailed history of all stock changes (In/Out/Adjustment).
- **Internal Transfers**: Transfer stock between warehouses with approval workflows.
- **Low Stock Alerts**: Automated notifications for reorder levels.

### 💰 Sales & Finance
- **Sales Workflow**: Quotation → Sales Order → Delivery Order → Invoice.
- **Dynamic Pricing**: Product pricing management.
- **Invoicing**: Automatic invoice generation from Sales Orders.
- **Payment Tracking**: Record partial and full payments.
- **PDF Generation**: Professional PDF export for Quotations, SO, DO, and Invoices.

### 🛡️ Security & Control
- **RBAC**: Granular permissions for Admin, Sales, Warehouse, and Finance roles.
- **System Settings**: Root-only access for critical system actions (e.g., Data Reset).
- **Audit Logs**: Comprehensive tracking of user actions.

## 🛠️ Tech Stack

- **Backend Framework**: Laravel 10
- **Frontend Library**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Icons**: Lucide React
- **Notifications**: Sonner + SweetAlert2

## 🚀 Quick Start (Local Development)

### Prerequisites
- PHP 8.1+
- Composer
- Node.js 18+
- MySQL 8.0+

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd inventory-sales
    ```

2.  **Install Backend Dependencies**
    ```bash
    composer install
    ```

3.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

4.  **Environment Setup**
    ```bash
    cp .env.example .env
    php artisan key:generate
    ```
    *Configure your database credentials in `.env`.*

5.  **Database Setup**
    ```bash
    php artisan migrate
    php artisan db:seed
    ```

6.  **Start the Application**
    *Terminal 1 (Backend):*
    ```bash
    php artisan serve
    ```
    *Terminal 2 (Frontend):*
    ```bash
    npm run dev
    ```

## 🌐 Deployment (VPS)

This project includes a **One-Click Deployment Script** for Linux VPS environments.

### Using the Deploy Script
1.  SSH into your VPS.
2.  Navigate to the project directory.
3.  Run the script:
    ```bash
    ./deploy.sh
    ```
    *This script handles git pull, dependency installation, building assets, migrations, and cache clearing automatically.*

For a detailed step-by-step guide on setting up a fresh VPS, please refer to [docs/VPS_DEPLOYMENT.md](docs/VPS_DEPLOYMENT.md).

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| **Super Admin (Root)** | `root@jinantruck.my.id` | `password` |
| **Admin** | `admin@example.com` | `password` |
| **Sales** | `sales@example.com` | `password` |
| **Warehouse** | `gudang@example.com` | `password` |
| **Finance** | `finance@example.com` | `password` |

## 📂 Project Structure

```
inventory-sales/
├── app/                    # Laravel Backend Logic
│   ├── Http/Controllers/   # API Controllers
│   ├── Models/             # Eloquent Models
│   ├── Services/           # Business Logic Services
│   └── ...
├── resources/              # Frontend Source
│   ├── js/
│   │   ├── components/     # Reusable React Components
│   │   ├── pages/          # Application Pages
│   │   ├── contexts/       # Global State (Auth, API, etc.)
│   │   └── ...
│   └── ...
├── database/               # Migrations & Seeders
├── routes/                 # API Routes
├── public/                 # Compiled Assets
├── docs/                   # Documentation
└── deploy.sh               # Deployment Script
```

## 📚 Documentation

- **VPS Deployment**: [docs/VPS_DEPLOYMENT.md](docs/VPS_DEPLOYMENT.md)
- **App Flow**: [documentation/app_flow_document.md](documentation/app_flow_document.md)
- **API Documentation**: Available at `/docs/api` (if configured)

## 📄 License

This project is proprietary software. All rights reserved.