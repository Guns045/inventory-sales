# Inventory Management System

A full-stack inventory and sales management application for supplier sparepart alat berat, built with Laravel and React.js.

## Features

Based on the workflow described in app.summary.md:
- **Sales Workflow**: Quotations → Sales Orders → Delivery Orders → Invoices
- **Role-based access**: Admin, Sales, Gudang (Warehouse), Finance
- **Inventory Management**: Products, Stock Levels, Warehouses
- **Sales Management**: Quotations, Sales Orders, Customers
- **Warehouse Management**: Delivery Orders, Goods Receipts
- **Finance Management**: Invoices, Payments

## How to Run

### Single Command Startup (Recommended)
1. Double-click the `start-app.bat` file in the root directory
2. This will automatically:
   - Start the Laravel backend server on port 8000
   - Start the React frontend server on port 3000
   - Open your default browser to the login page

### Manual Startup
#### 1. Start Laravel Backend
1. Open Command Prompt as Administrator
2. Navigate to the project root directory: `cd C:\xampp\htdocs\jinan-inventory`
3. Run the Laravel development server: `start-laravel.bat`
4. The API will be available at: `http://127.0.0.1:8000`

#### 2. Start React Frontend
1. Open another Command Prompt window
2. Navigate to the frontend directory: `cd C:\xampp\htdocs\jinan-inventory\frontend`
3. Run the React development server: `start-react.bat`
4. The application will be available at: `http://localhost:3000`

### 3. Access the Application
1. The browser will automatically open to: `http://localhost:3000`
2. You will see the login screen
3. After successful login, you will be redirected to your role-based dashboard

## Application Workflow

The application follows the complete workflow described in app.summary.md:

1. **Sales Role**: Create quotations → Submit for approval
2. **Management Role**: Approve/reject quotations
3. **Sales/Admin Role**: Convert approved quotations to sales orders
4. **Warehouse Role**: Process sales orders → Create delivery orders
5. **Finance Role**: Create invoices from sales orders/delivery orders → Track payments

## Database Setup

The application uses SQLite by default. All required database tables have been created with migrations including:
- Users, Roles (for authentication)
- Products, Categories, Suppliers, Customers, Warehouses
- Quotations, Sales Orders, Delivery Orders, Invoices, Payments
- Purchase Orders, Goods Receipts, Stock Movements

## API Endpoints

All API endpoints are available at `http://127.0.0.1:8000/api` and require authentication via Sanctum tokens for protected routes.

## Role-based Access

- **Admin**: Full access to all features
- **Sales**: Access to quotations, sales orders, customers, products, stock levels
- **Gudang**: Access to sales orders, delivery orders, goods receipts, warehouses, stock levels
- **Finance**: Access to invoices, payments, suppliers, purchase orders