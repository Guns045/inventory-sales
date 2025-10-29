# Role-Based Access Control (RBAC) Documentation

## Overview

This document describes the implementation of Role-Based Access Control (RBAC) for the Inventory and Sales Management System. The system supports four main roles: Sales, Admin/Manager, Warehouse, and Finance.

## Backend Implementation

### 1. Role Model

**File:** `app/Models/Role.php`

```php
class Role extends Model
{
    protected $fillable = [
        'name',
        'description',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
```

### 2. User Model with Role Relationship

**File:** `app/Models/User.php`

```php
class User extends Authenticatable
{
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }
}
```

### 3. Role Middleware

**File:** `app/Http/Middleware/RoleMiddleware.php`

The middleware checks if the authenticated user has the required role:

```php
public function handle(Request $request, Closure $next, $role)
{
    $user = Auth::user();

    if (!$user) {
        return response()->json(['message' => 'Unauthorized'], 401);
    }

    $userRole = is_string($user->role) ? $user->role : $user->role->name;

    if ($userRole !== $role) {
        return response()->json(['message' => 'Forbidden - Insufficient permissions'], 403);
    }

    return $next($request);
}
```

### 4. Role Controller

**File:** `app/Http/Controllers/API/RoleController.php`

The RoleController handles role-based permissions and menu items:

#### Key Methods:

- `getUserPermissions()`: Returns user permissions and menu items based on role
- `checkPermission()`: Checks if user has specific permission
- `getRolePermissions()`: Defines permissions and menu items for each role

### 5. API Endpoints

#### Authentication & Permissions
```
POST   /api/login              # User login
POST   /api/logout             # User logout
GET    /api/user/permissions   # Get user permissions and menu items
POST   /api/check-permission/{permission} # Check specific permission
```

#### Role-Based Dashboard Endpoints
```
GET    /api/dashboard              # General dashboard
GET    /api/dashboard/sales        # Sales dashboard data
GET    /api/dashboard/approval     # Approval dashboard data
GET    /api/dashboard/warehouse    # Warehouse dashboard data
GET    /api/dashboard/finance      # Finance dashboard data
```

## Frontend Implementation

### 1. Permission Context

**File:** `frontend/src/contexts/PermissionContext.js`

Provides permission-based functionality throughout the app:

- Fetches user permissions from API
- Provides `visibleMenuItems` based on user role
- Handles permission checking

### 2. Layout Component

**File:** `frontend/src/components/Layout.js`

The main layout component includes:

- **Dynamic Sidebar**: Shows menu items based on user permissions
- **Role-based Navigation**: Different menu items for different roles
- **Logout Functionality**: Handles logout action from sidebar menu

### 3. Role-Based Dashboards

#### Sales Dashboard
**File:** `frontend/src/pages/DashboardSales.js`

**Features:**
- Quotations statistics (draft, approved, rejected)
- Sales orders tracking
- Quick actions for creating quotations and converting to SO
- Recent quotations table
- Sales activities panel

#### Warehouse Dashboard
**File:** `frontend/src/pages/DashboardWarehouse.js`

**Features:**
- Sales orders status tracking (pending, processing, ready)
- Delivery orders management
- Low stock alerts
- Pending pickings list
- Warehouse alerts panel

#### Finance Dashboard
**File:** `frontend/src/pages/DashboardFinance.js`

**Features:**
- Financial statistics (invoices, revenue, outstanding payments)
- Recent invoices table
- Overdue invoice alerts
- Top customers by revenue
- Financial summary panel

#### Admin Dashboard
**File:** `frontend/src/pages/Dashboard.js` (AdminDashboard component)

**Features:**
- Full system overview
- Access to all management features
- Administrative functions

## Role Definitions

### 1. Sales Role

**Permissions:**
- `dashboard.read`
- `stock.read` (view only)
- `quotations.read`, `quotations.create`, `quotations.update`, `quotations.submit`, `quotations.convert`
- `sales_orders.read` (view only)
- `invoices.read` (view only)

**Menu Items:**
1. Dashboard (`/dashboard/sales`)
2. Stock (`/stock`) - View only
3. Quotations (`/quotations`) - Create, submit for approval, convert to SO
4. Sales Orders (`/sales-orders`) - View status
5. Invoices (`/invoices`) - View status
6. Logout

### 2. Admin/Manager Role

**Permissions:**
- Full access to all resources
- User management
- System settings
- Report generation

**Menu Items:**
1. Dashboard (`/dashboard`)
2. User Management (`/users`)
3. Master Data (Customers, Suppliers, Products, Categories)
4. Inventory Management (Stock, Warehouses)
5. Sales Management (Quotations, Sales Orders, Invoices)
6. Approval System
7. Reports
8. Settings
9. Logout

### 3. Warehouse Role

**Permissions:**
- `dashboard.read`
- `warehouses.read`, `warehouses.update`
- `stock.read`, `stock.update`
- `sales_orders.read`, `sales_orders.update`
- `delivery_orders.read`, `delivery_orders.create`, `delivery_orders.update`
- `goods_receipts.read`, `goods_receipts.create`, `goods_receipts.update`

**Menu Items:**
1. Dashboard (`/dashboard/warehouse`)
2. Warehouses (`/warehouses`)
3. Stock (`/stock`)
4. Sales Orders (`/sales-orders`)
5. Delivery Orders (`/delivery-orders`)
6. Goods Receipts (`/goods-receipts`)
7. Logout

### 4. Finance Role

**Permissions:**
- `dashboard.read`
- `customers.read`, `customers.update`
- `sales_orders.read`
- `invoices.read`, `invoices.create`, `invoices.update`
- `payments.read`, `payments.create`, `payments.update`
- `reports.read`

**Menu Items:**
1. Dashboard (`/dashboard/finance`)
2. Customers (`/customers`)
3. Sales Orders (`/sales-orders`)
4. Invoices (`/invoices`)
5. Payments (`/payments`)
6. Reports (`/reports`)
7. Logout

## API Response Format

### Get User Permissions Response

```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Sales"
  },
  "permissions": {
    "dashboard": ["read"],
    "stock": ["read"],
    "quotations": ["read", "create", "update", "submit", "convert"],
    "sales_orders": ["read"],
    "invoices": ["read"]
  },
  "menu_items": [
    {
      "title": "Dashboard",
      "path": "/dashboard/sales",
      "icon": "bi-speedometer2",
      "permission": "dashboard.read"
    },
    {
      "title": "Stock",
      "path": "/stock",
      "icon": "bi-archive",
      "permission": "stock.read",
      "description": "Lihat stok produk"
    },
    // ... more menu items
  ]
}
```

## Frontend Component Structure

```
frontend/src/
├── components/
│   └── Layout.js                 # Main layout with dynamic sidebar
├── contexts/
│   ├── AuthContext.js           # Authentication context
│   ├── APIContext.js           # API context
│   └── PermissionContext.js    # Permission management
├── pages/
│   ├── Dashboard.js            # Main dashboard router
│   ├── DashboardSales.js       # Sales-specific dashboard
│   ├── DashboardWarehouse.js   # Warehouse-specific dashboard
│   ├── DashboardFinance.js     # Finance-specific dashboard
│   └── ...                     # Other page components
```

## Security Considerations

1. **Backend Validation**: All API endpoints validate user permissions
2. **Frontend Routing**: Menu items are filtered based on permissions
3. **Role Middleware**: Protects sensitive endpoints
4. **Permission Checking**: Fine-grained permission control
5. **Authentication Tokens**: Uses Laravel Sanctum for API authentication

## Setup Instructions

### Backend Setup

1. Ensure roles are created in the database
2. Assign roles to users through the `role_id` foreign key
3. The middleware is already registered in `bootstrap/app.php`

### Frontend Setup

1. The PermissionContext automatically fetches user permissions on app load
2. The Layout component dynamically renders menu items based on permissions
3. Dashboard components are automatically selected based on user role

## Usage Examples

### Checking Permissions in Frontend

```javascript
import { usePermissions } from '../contexts/PermissionContext';

const { hasPermission } = usePermissions();

// Check if user can create quotations
if (hasPermission('quotations.create')) {
  // Show create button
}
```

### Protecting API Routes

```php
// In routes/api.php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('users', UserController::class);
});
```

This RBAC system provides a secure and flexible way to manage user access to different parts of the application based on their roles and responsibilities.