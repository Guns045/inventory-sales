# Role-Based Access Control (RBAC) Documentation

## Overview
Implementasi Role-Based Access Control (RBAC) untuk sistem Inventory Management yang memungkinkan pengaturan akses menu dan fungsi berdasarkan peran pengguna (role).

## 🏗️ Arsitektur Sistem

### Backend (Laravel)
- **Controller**: `app/Http/Controllers/API/RoleController.php`
- **API Endpoints**:
  - `GET /api/user/permissions` - Mendapatkan permissions dan menu items user
  - `POST /api/check-permission/{permission}` - Cek permission spesifik

### Frontend (React)
- **Context**: `src/contexts/PermissionContext.js`
- **Layout**: `src/components/Layout.js` (Role-based sidebar)
- **Styling**: Enhanced CSS untuk role-based UI

## 👥 User Roles & Permissions

### 1. Admin Role
**Full Access** - Memiliki akses penuh ke seluruh sistem

**Permissions:**
- `dashboard`: read, create, update, delete
- `users`: read, create, update, delete
- `customers`: read, create, update, delete
- `suppliers`: read, create, update, delete
- `products`: read, create, update, delete
- `categories`: read, create, update, delete
- `stock`: read, create, update, delete
- `quotations`: read, create, update, delete, approve, reject
- `sales_orders`: read, create, update, delete
- `invoices`: read, create, update, delete
- `approvals`: read, approve, reject
- `reports`: read
- `settings`: read, update

**Menu Items:**
1. Dashboard (`/dashboard`)
2. Manajemen User (`/users`)
3. Customers (`/customers`)
4. Suppliers (`/suppliers`)
5. Products (`/products`)
6. Stock (`/stock`)
7. Quotations (`/quotations`)
8. Sales Orders (`/sales-orders`)
9. Invoices (`/invoices`)
10. Approvals (`/approvals`)
11. Laporan (`/reports`)
12. Settings (`/settings`)

### 2. Sales Role
**Sales Operations** - Fokus pada penjualan dan penawaran

**Permissions:**
- `dashboard`: read
- `customers`: read, create
- `products`: read
- `stock`: read (view only)
- `quotations`: read, create, update, submit
- `sales_orders`: read, create, update
- `invoices`: read (view only)

**Menu Items:**
1. Dashboard (`/dashboard/sales`)
2. Stock (`/stock`) - *Lihat stok produk*
3. Quotations (`/quotations`) - *Buat dan kelola penawaran*
4. Sales Orders (`/sales-orders`) - *Kelola pesanan penjualan*
5. Invoices (`/invoices`) - *Lihat status invoice*

### 3. Gudang Role
**Warehouse Operations** - Fokus pada manajemen stok dan pengiriman

**Permissions:**
- `dashboard`: read
- `products`: read
- `stock`: read, update
- `sales_orders`: read, update

**Menu Items:**
1. Dashboard (`/dashboard/warehouse`)
2. Stock (`/stock`)
3. Sales Orders (`/sales-orders`)

### 4. Finance Role
**Financial Operations** - Fokus pada keuangan dan laporan

**Permissions:**
- `dashboard`: read
- `customers`: read
- `sales_orders`: read
- `invoices`: read, create, update
- `reports`: read

**Menu Items:**
1. Dashboard (`/dashboard/finance`)
2. Customers (`/customers`)
3. Sales Orders (`/sales-orders`)
4. Invoices (`/invoices`)
5. Laporan (`/reports`)

## 🔧 Implementation Details

### Backend Implementation

#### RoleController Methods

```php
// Mendapatkan permissions dan menu items untuk user
public function getUserPermissions(Request $request)

// Mengecek permission spesifik
public function checkPermission(Request $request, $permission)

// Helper method untuk mendapatkan role permissions
private function getRolePermissions($role)

// Helper method untuk validasi permission
private function hasPermission($permission, $permissions)
```

#### API Response Structure

```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "Admin"
  },
  "permissions": {
    "dashboard": ["read", "create", "update", "delete"],
    "quotations": ["read", "create", "update", "delete", "approve", "reject"],
    // ... other permissions
  },
  "menu_items": [
    {
      "title": "Dashboard",
      "path": "/dashboard",
      "icon": "bi-speedometer2",
      "permission": "dashboard.read"
    },
    // ... other menu items
  ]
}
```

### Frontend Implementation

#### PermissionContext Hook

```javascript
import { usePermissions } from '../contexts/PermissionContext';

const {
  user,
  permissions,
  visibleMenuItems,
  hasPermission,
  canRead,
  canCreate,
  canUpdate,
  canDelete,
  canApprove,
  canReject
} = usePermissions();
```

#### Usage Examples

```javascript
// Cek permission
if (canCreate('quotations')) {
  // Tampilkan tombol create quotation
}

// Filter menu items berdasarkan permissions
const menuItems = visibleMenuItems.map(item => (
  <MenuItem key={item.path} {...item} />
));

// Conditional rendering
{canApprove() && <ApprovalButton />}
```

## 📁 File Structure

```
Backend:
├── app/Http/Controllers/API/
│   └── RoleController.php
└── routes/
    └── api.php

Frontend:
├── src/
│   ├── contexts/
│   │   └── PermissionContext.js
│   ├── components/
│   │   └── Layout.js
│   └── App.css
```

## 🎨 UI/UX Features

### Sidebar Enhancements
- **Role Badge**: Menampilkan role user dengan warna berbeda
- **Menu Descriptions**: Tooltip untuk setiap menu item
- **Dynamic Loading**: Spinner saat loading permissions
- **Responsive Design**: Mobile-friendly sidebar

### Role Badge Colors
- **Admin**: Red (`#dc3545`)
- **Sales**: Teal (`#17a2b8`)
- **Gudang**: Green (`#28a745`)
- **Finance**: Yellow (`#ffc107`)

### Permission-Based Visibility
- Menu items otomatis difilter berdasarkan permissions
- Components dapat disembunyikan jika tidak memiliki akses
- Visual feedback untuk items yang tidak dapat diakses

## 🔐 Security Features

### Permission Validation
- Server-side validation di setiap API endpoint
- Client-side permission checking untuk UX
- Route protection berdasarkan permissions
- Automatic menu filtering

### Data Protection
- Permissions hanya di-load untuk user yang sedang login
- Token-based authentication
- Secure API endpoints dengan middleware

## 🧪 Testing

### Test API Endpoints

```bash
# Test Admin permissions
curl -H "Authorization: Bearer {token}" \
     http://localhost:8000/api/user/permissions

# Test specific permission
curl -X POST \
     -H "Authorization: Bearer {token}" \
     http://localhost:8000/api/check-permission/quotations.create
```

### Test Frontend

1. **Login dengan role berbeda:**
   - Admin: `admin@example.com` / `password`
   - Sales: `sales@example.com` / `password`

2. **Verifikasi menu items:**
   - Setiap role hanya melihat menu yang relevant
   - Descriptions muncul pada hover

3. **Test permissions:**
   - Coba akses halaman yang tidak diizinkan
   - Verifikasi buttons yang tersembunyi/terlihat

## 📝 Usage Guidelines

### Adding New Permissions
1. Update `getRolePermissions()` di `RoleController.php`
2. Add menu item dengan permission yang sesuai
3. Update frontend components untuk menggunakan permission checks

### Creating New Roles
1. Add role configuration di `getRolePermissions()`
2. Define permissions untuk role baru
3. Set up menu items yang appropriate
4. Add CSS styling untuk role badge

### Modifying Existing Roles
1. Update permissions array di `getRolePermissions()`
2. Modify menu items as needed
3. Test thoroughly to ensure security

## 🚀 Deployment Notes

### Environment Variables
Tidak ada environment variables khusus yang diperlukan untuk RBAC.

### Database
- User roles disimpan di table `users` dengan kolom `role_id`
- Role definitions di-hardcode di controller untuk security

### Frontend Build
- Permission context otomatis di-load saat aplikasi start
- Sidebar dinamis berdasarkan user permissions

## 🔮 Future Enhancements

### Planned Features
- [ ] Dynamic role management di database
- [ ] Permission inheritance
- [ ] Activity logging based on permissions
- [ ] Custom role creation
- [ ] API endpoint untuk role management
- [ ] Permission groups/categories

### Security Improvements
- [ ] Rate limiting untuk permission checks
- [ ] Audit trail untuk permission changes
- [ ] Session-based permission caching
- [ ] IP-based access control

## 📞 Support

Untuk masalah atau pertanyaan mengenai RBAC implementation:

1. **Backend Issues**: Check `RoleController.php` dan API routes
2. **Frontend Issues**: Check `PermissionContext.js` dan `Layout.js`
3. **Permission Issues**: Verify role assignments dan permission definitions
4. **UI Issues**: Check CSS styling dan responsive design

---

**Last Updated**: October 28, 2025
**Version**: 1.0.0
**Author**: Development Team