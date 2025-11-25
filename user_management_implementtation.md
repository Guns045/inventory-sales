 ---
  🔧 TEKNOLOGI YANG AKAN DIGUNAKAN

  Backend:

  - ✅ Spatie Laravel Permission (migrasi dari JSON-based)
  - ✅ Laravel 12.x (existing)
  - ✅ MySQL Database (existing)

  Frontend:

  - ✅ React Hook Form (install baru)
  - ✅ Bootstrap 5 + React Bootstrap (existing)
  - ✅ React 19 (existing)
  - ✅ APIContext (existing)

  ---
  📊 PERMISSION MODULES (Updated + Document Printing)

  $permissionModules = [
      'User Management' => [
          'view_users', 'create_users', 'edit_users', 'delete_users'
      ],
      'Product Management' => [
          'view_products', 'create_products', 'edit_products', 'delete_products'
      ],
      'Warehouse Management' => [
          'view_warehouses', 'create_warehouses', 'edit_warehouses'
      ],
      'Quotations & Sales' => [
          'view_quotations', 'create_quotations', 'edit_quotations', 'approve_quotations',
          'view_sales_orders', 'create_sales_orders', 'edit_sales_orders'
      ],
      'Purchase Orders' => [
          'view_purchase_orders', 'create_purchase_orders', 'edit_purchase_orders'
      ],
      'Inventory & Stock' => [
          'view_stock', 'adjust_stock', 'view_stock_movements'
      ],
      'Goods Receipt' => [
          'view_goods_receipts', 'create_goods_receipts', 'edit_goods_receipts'
      ],
      'Invoices & Payments' => [
          'view_invoices', 'create_invoices', 'edit_invoices',
          'view_payments', 'create_payments', 'edit_payments'
      ],
      'Document Management' => [
          'print_quotation',        // Print PQ
          'print_picking_list',     // Print PL  
          'print_delivery_order',   // Print DO
          'print_purchase_order',   // Print PO
          'print_invoice'          // Print PI
      ],
      'Internal Transfers' => [
          'view_transfers', 'create_transfers', 'approve_transfers'
      ],
      'Reports' => [
          'view_reports', 'export_reports'
      ],
      'System Settings' => [
          'view_company_settings', 'edit_company_settings', 'manage_roles'
      ]
  ];

  ---
  🚀 PRIORITAS FITUR (Phase 1)

  🥇 High Priority:

  1. Add New User - Form create user dengan role & permission selection
  2. Edit Existing User - Form edit user dengan password optional
  3. Role & Permission Management - CRUD roles dengan permission checkboxes

  🥈 Medium Priority (Next Phase):

  4. User Listing - Table dengan search & pagination
  5. User Status Management - Activate/deactivate users
  6. Advanced Permissions - Document printing permissions

  ---
  🔄 MIGRATION STRATEGY: JSON → Spatie

  Step 1: Install Spatie

  composer require spatie/laravel-permission
  php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
  php artisan migrate

  Step 2: Database Migration

  -- Create Spatie tables:
  - permissions
  - roles
  - model_has_permissions
  - model_has_roles
  - role_has_permissions

  -- Migrate existing data:
  roles table → roles table (Spatie)
  JSON permissions → individual permission records
  users.role_id → model_has_roles table

  Step 3: Model Updates

  // User.php
  use Spatie\Permission\Traits\HasRoles;

  class User extends Authenticatable {
      use HasApiTokens, HasFactory, Notifiable, HasRoles;
      // ... existing code
  }

  // Role.php (optional - bisa pakai Spatie Role)

  ---
  📁 FILE STRUCTURE PLAN

  Backend Files:

  app/
  ├── Http/Controllers/API/
  │   ├── UserController.php (enhanced)
  │   ├── RoleController.php (enhanced)
  │   └── PermissionController.php (new)
  ├── Models/
  │   ├── User.php (add HasRoles trait)
  │   └── Role.php (keep atau hapus)
  └── Services/
      └── PermissionService.php (optional)

  database/
  ├── migrations/
  │   ├── AddIsActiveToUsersTable.php
  │   └── Spatie permission migrations
  └── seeders/
      ├── RoleSeeder.php (update untuk Spatie)
      └── PermissionSeeder.php (new)

  routes/api.php (update routes)

  Frontend Files:

  resources/js/
  ├── pages/
  │   └── Users.jsx (complete rewrite)
  ├── components/
  │   ├── UserModal.jsx (create/edit)
  │   ├── PermissionPanel.jsx (grouped checkboxes)
  │   ├── UserStatusBadge.jsx
  │   └── UsersTable.jsx
  └── hooks/
      └── useUserManagement.jsx (optional)

  ---
  🛠 IMPLEMENTATION PHASES

  Phase 1: Foundation (Priority Features)

  1. Backend Setup
    - Install & configure Spatie Laravel Permission
    - Migrate existing role/permission data
    - Seed default permissions
    - Create API endpoints
  2. Frontend Foundation
    - Install React Hook Form
    - Create main Users.jsx layout
    - Basic user listing
    - Create/Edit user modal
  3. Core Features
    - Add New User functionality
    - Edit Existing User functionality
    - Role assignment dropdown
    - Permission checkboxes (grouped)

  Phase 2: Enhancement

  1. Advanced UI
    - Search & filter users
    - Pagination
    - Status management
    - Bulk actions
  2. Permission Management
    - Create/edit roles
    - Permission templates
    - Document printing permissions

  Phase 3: Polish

  1. Advanced Features
    - User activity logs
    - Permission inheritance
    - Warehouse-specific access
    - Advanced search

  ---
  📦 DEPENDENCIES TO INSTALL

  Backend:

  composer require spatie/laravel-permission

  Frontend:

  npm install react-hook-form @hookform/resolvers yup

  ---
  🔗 API ENDPOINTS PLAN

  // User Management
  GET    /api/users              - List users dengan pagination
  POST   /api/users              - Create user
  GET    /api/users/{id}         - Detail user
  PUT    /api/users/{id}         - Update user
  DELETE /api/users/{id}         - Delete user (soft delete)

  // Role & Permission Management
  GET    /api/roles              - List roles
  POST   /api/roles              - Create role
  PUT    /api/roles/{id}         - Update role
  DELETE /api/roles/{id}         - Delete role

  GET    /api/permissions        - List permissions grouped
  POST   /api/permissions        - Create permission
  GET    /api/permissions/grouped - Get grouped permissions

  // User Status
  PUT    /api/users/{id}/status  - Update user status
  POST   /api/users/{id}/activate - Activate user
  POST   /api/users/{id}/deactivate - Deactivate user

  ---
  ✅ KEY POINTS FOR REVIEW

  Major Changes:

  1. Permission System Migration dari JSON-based ke Spatie
  2. New Dependencies: React Hook Form + Spatie Laravel Permission
  3. Document Printing Permissions sudah termasuk
  4. Priority Features difokuskan ke Add/Edit User & Role Management

  Considerations:

  1. Data Migration perlu hati-hati agar tidak kehilangan existing roles
  2. Backward Compatibility selama migrasi
  3. Permission Testing untuk memastikan semua working
  4. UI Complexity dengan banyak permission checkboxes