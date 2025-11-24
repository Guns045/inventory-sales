# Laravel + React Inventory-Sales Management System

A comprehensive multi-warehouse inventory and sales management system built with Laravel (backend API) and React (frontend), featuring Role-Based Access Control (RBAC), document workflows, and real-time stock management.

## 🚀 Quick Start

### Development Commands

#### **Option 1: Automated Startup (Recommended)**
```bash
# Windows - Main startup script (starts both services)
start.bat

# Alternative startup scripts
scripts/start-app.bat          # Full application
scripts/start-simple.bat       # Simplified startup
scripts/start-backend.bat      # Backend only
scripts/start-frontend.bat     # Frontend only

# PowerShell
.\scripts\Start-Application.ps1
```

#### **Option 2: Manual Startup**
```bash
# Terminal 1 - Laravel Backend
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 - React Frontend
npm run dev

# Terminal 3 - Queue Worker (optional)
php artisan queue:work
```

#### **Database Operations**
```bash
# Fresh installation
php artisan migrate:fresh --seed

# Run migrations only
php artisan migrate

# Seed data
php artisan db:seed

# Create specific seeder
php artisan db:seed --class=UserSeeder
```

#### **Testing & Quality**
```bash
# Run Laravel tests
php artisan test

# Run Pest tests (if installed)
./vendor/bin/pest

# Code formatting
./vendor/bin/pint

# Clear caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## 🏗️ Architecture Overview

### **Technology Stack**
- **Backend**: Laravel 12.x with PHP 8.2+
- **Frontend**: React 19 with React Router DOM 7.9+
- **UI Framework**: Bootstrap 5 with React Bootstrap
- **Database**: MySQL with Eloquent ORM
- **Authentication**: Laravel Sanctum (Token-based)
- **PDF Generation**: DOMPDF
- **Build Tools**: Vite 7.x with TailwindCSS 4.x
- **HTTP Client**: Axios with interceptors

### **Multi-Warehouse System Architecture**
The system is designed for multi-warehouse inventory management with:
- **Warehouse-specific data isolation**: Users see only their assigned warehouse data
- **Cross-warehouse transfers**: Internal transfer system with approval workflows
- **Real-time stock tracking**: Per-warehouse stock levels with reservation system
- **Document numbering**: Warehouse-based document numbering (SO-001/JKT/MM-YYYY)

## 🔧 Development Configuration

### **Environment Setup (.env)**
```env
# Database (SQLite default, MySQL recommended for production)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=inventory_sales
DB_USERNAME=root
DB_PASSWORD=

# Mail Configuration (for PO emails)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_ADDRESS="noreply@yourcompany.com"
```

### **Network/LAN Access Configuration**
For multi-device testing on local network:

1. **Update vite.config.js**:
```javascript
export default defineConfig({
    server: {
        host: '0.0.0.0',  // or your specific IP like '192.168.1.100'
        port: 3000,
        cors: true,
    }
});
```

2. **Start Laravel with network access**:
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

3. **Access from other devices**: `http://YOUR_IP:3000`

### **CORS Configuration**
- **Config**: `config/cors.php` - Pre-configured for localhost and network IPs
- **Dynamic Origins**: Supports multiple development ports (3000, 3001, 5173, etc.)
- **Network Access**: Includes specific IP addresses for LAN testing

## 👥 Role-Based Access Control (RBAC)

### **User Roles & Permissions**
```php
// Role Hierarchy (highest to lowest)
Super Admin > Admin > Manager > Staff

// Default Roles
- Super Admin: Full system access, all warehouses
- Sales Team: Quotations, sales orders, customer management
- Warehouse Staff: Stock management, order fulfillment
- Finance Team: Invoicing, payments, financial reports
```

### **Permission System**
- **Resource-based**: `quotations.create`, `product-stock.read`, `users.update`
- **Warehouse-specific**: Users can only access assigned warehouse data
- **Middleware Protection**: `PermissionMiddleware` enforces permissions on API routes
- **Frontend Integration**: React components use `usePermissions()` hook

### **Default Credentials**
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@example.com | password |
| Sales | sales@example.com | password |
| Warehouse | gudang@example.com | password |
| Finance | finance@example.com | password |

## 📊 Database Structure & Key Models

### **Core Entity Relationships**
```
User ── belongsTo ──> Role
User ── belongsTo ──> Warehouse

Product ── hasMany ──> ProductStock
ProductStock ── belongsTo ──> Product
ProductStock ── belongsTo ──> Warehouse

Quotation ── hasMany ──> QuotationItem
SalesOrder ── hasMany ──> SalesOrderItem
Invoice ── hasMany ──> InvoiceItem
PurchaseOrder ── hasMany ──> PurchaseOrderItem
GoodsReceipt ── hasMany ──> GoodsReceiptItem
```

### **Key Models & Features**
- **Product**: SKU, name, description, pricing, category, supplier relationships
- **ProductStock**: Per-warehouse stock levels with reservation system
- **Warehouse**: Multi-location support with manager assignment
- **StockMovement**: Complete audit trail of all stock transactions
- **Document Models**: Quotations → Sales Orders → Invoices workflow
- **Transfer System**: Internal warehouse transfers with approval process

### **Document Numbering Pattern**
```
Format: [DOC_TYPE]-[SEQUENCE]/[WAREHOUSE_CODE]/[MM-YYYY]

Examples:
- SO-001/JKT/11-2025 (Sales Order #1 from Jakarta, Nov 2025)
- IT-002/MKS/11-2025 (Internal Transfer #2 from Makassar, Nov 2025)
- PO-003/JKT/11-2025 (Purchase Order #3 from Jakarta, Nov 2025)
```

## ⚛️ Frontend Architecture

### **React Component Structure**
```
resources/js/
├── app.jsx                 # Main app entry with routing
├── contexts/               # React contexts
│   ├── AuthContext.jsx     # Authentication state
│   ├── APIContext.jsx      # Axios instance & API calls
│   ├── PermissionContext.jsx # Role-based permissions
│   ├── CompanyContext.jsx  # Company settings & logo
│   └── NotificationContext.jsx # Toast notifications
├── components/             # Reusable components
│   ├── Layout.jsx          # Main layout with sidebar
│   ├── RoleBasedRoute.jsx  # Protected routes
│   └── ErrorBoundary.jsx   # Error handling
└── pages/                  # Page components
    ├── Dashboard*.jsx      # Role-specific dashboards
    ├── Products.jsx        # Product management
    ├── ProductStock.jsx    # Stock management
    ├── Quotations.jsx      # Quotation workflow
    ├── SalesOrders.jsx     # Sales order management
    ├── PurchaseOrders.jsx  # Purchase order system
    ├── Invoices.jsx        # Invoice management
    └── InternalTransfers.jsx # Warehouse transfers
```

### **API Integration Patterns**
```javascript
// Using APIContext for authenticated requests
import { useAPI } from '../contexts/APIContext';

const { api } = useAPI();

// GET request with automatic token handling
const response = await api.get('/products');

// POST request with data
const result = await api.post('/quotations', quotationData);
```

### **Authentication Flow**
1. **Login**: User credentials → Laravel Sanctum token
2. **Token Storage**: localStorage with validation
3. **API Calls**: Automatic Bearer token injection via Axios interceptors
4. **Role-based Routing**: Redirect to appropriate dashboard based on role
5. **Auto-logout**: Clear tokens on 401 responses

## 🔄 Business Workflows

### **Sales Workflow**
```
Quotation (DRAFT → APPROVED → CONVERTED)
  ↓
Sales Order (PENDING → CONFIRMED → READY_TO_SHIP → SHIPPED)
  ↓
Delivery Order (DRAFT → READY_TO_SHIP → SHIPPED → DELIVERED)
  ↓
Invoice (DRAFT → SENT → PARTIAL → PAID)
```

### **Purchase Workflow**
```
Purchase Order (DRAFT → SENT → CONFIRMED → PARTIAL_RECEIVED → COMPLETED)
  ↓
Goods Receipt (PENDING → RECEIVED → COMPLETED)
```

### **Internal Transfer Workflow**
```
Transfer Request (PENDING → APPROVED → IN_TRANSIT)
  ↓
Picking List (DRAFT → CONFIRMED → PICKED)
  ↓
Delivery Order (DRAFT → DELIVERED)
  ↓
Stock Receipt (COMPLETED)
```

## 🛠️ Important Technical Patterns

### **Laravel Backend Patterns**
- **API Controllers**: RESTful with role-based filtering
- **Middleware**: PermissionMiddleware for route protection
- **Resource Controllers**: Standard CRUD operations with additional endpoints
- **Transformers**: Data transformation for API responses
- **Activity Logging**: Comprehensive audit trail via ActivityLog model
- **Email Integration**: Laravel Mail with PDF attachments for purchase orders

### **React Frontend Patterns**
- **Context-based State Management**: Auth, API, Permissions, Company data
- **Role-based UI**: Dynamic menu and component visibility
- **Error Boundaries**: Comprehensive error handling with debugging
- **Real-time Updates**: Stock reservations and status changes
- **Form Handling**: Controlled components with validation
- **PDF Generation**: Browser-based PDF viewing and printing

### **Security Features**
- **Token-based Authentication**: Laravel Sanctum with expiration
- **CORS Protection**: Configured for development and production
- **Permission Validation**: Server-side permission checking on all API routes
- **Input Validation**: Laravel validation rules with custom messages
- **SQL Injection Prevention**: Eloquent ORM with parameter binding

### **Performance Optimizations**
- **Eager Loading**: `with()` relationships to prevent N+1 queries
- **Database Indexing**: Optimized for warehouse-based queries
- **API Response Caching**: Configurable cache headers for static data
- **Frontend Code Splitting**: Lazy loading of page components
- **Asset Optimization**: Vite build optimization for production

## 📁 Project Structure

```
inventory-sales/
├── app/
│   ├── Http/Controllers/API/    # API controllers
│   ├── Models/                  # Eloquent models
│   └── Middleware/              # Custom middleware
├── database/
│   ├── migrations/              # Database schema
│   └── seeders/                 # Initial data
├── resources/js/
│   ├── components/              # React components
│   ├── contexts/                # React contexts
│   └── pages/                   # Page components
├── routes/api.php               # API routes with middleware
├── config/                      # Laravel configuration
├── docs/                        # Documentation files
├── scripts/                     # Development scripts
└── tests/                       # Test files
```

## 📚 Additional Documentation

- **API Documentation**: `docs/API-Documentation.md`
- **RBAC Guide**: `docs/RBAC_DOCUMENTATION.md`
- **Multi-Device Setup**: `docs/MULTI_DEVICE_SETUP.md`
- **Quick Start**: `docs/QUICK_START_MULTI_DEVICE.md`
- **Project Status**: `todo.md` - Current development progress and issues

## 🚨 Development Workflow Rules

### **Code Quality Standards**
1. **Follow Existing Patterns**: Use established component and controller patterns
2. **Role-Based Development**: Always consider user roles and permissions
3. **Warehouse Awareness**: Implement warehouse-specific filtering where applicable
4. **Error Handling**: Comprehensive error handling with user-friendly messages
5. **Activity Logging**: Log important business operations for audit trails

### **Database Development**
1. **Use Migrations**: All schema changes must be version-controlled
2. **Foreign Keys**: Maintain data integrity with proper relationships
3. **Indexing**: Add indexes for frequently queried columns
4. **Soft Deletes**: Use soft deletes for important data
5. **Seeders**: Provide realistic test data in seeders

### **Frontend Development**
1. **Component Reusability**: Create reusable components for common patterns
2. **State Management**: Use contexts for shared state, local state for component-specific data
3. **Responsive Design**: Ensure mobile compatibility
4. **Loading States**: Show loading indicators during API calls
5. **Error Boundaries**: Wrap components in error boundaries for better debugging

### **API Development**
1. **RESTful Principles**: Use proper HTTP methods and status codes
2. **Consistent Responses**: Standardize API response format
3. **Validation**: Validate all incoming data
4. **Permission Checks**: Implement server-side permission validation
5. **Documentation**: Document API endpoints with examples

---

**System Status**: Production Ready with multi-warehouse inventory management, sales workflows, and comprehensive role-based access control.