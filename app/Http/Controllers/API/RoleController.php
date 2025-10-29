<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Role;
use App\Models\User;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $roles = Role::all();
        return response()->json($roles);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles',
            'description' => 'nullable|string',
        ]);

        $role = Role::create($request->all());

        return response()->json($role, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $role = Role::findOrFail($id);
        return response()->json($role);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $id,
            'description' => 'nullable|string',
        ]);

        $role->update($request->all());

        return response()->json($role);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);
        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    /**
     * Get user permissions and menu items based on role
     */
    public function getUserPermissions(Request $request)
    {
        $user = $request->user();

        // Get role name - handle both string and object
        $roleName = is_string($user->role) ? $user->role : $user->role->name;

        $permissions = $this->getRolePermissions($roleName);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
            ],
            'permissions' => $permissions,
            'menu_items' => $permissions['menu_items']
        ]);
    }

    /**
     * Get role-based permissions
     */
    private function getRolePermissions($role)
    {
        $roles = [
            'Admin' => [
                'dashboard' => ['read', 'create', 'update', 'delete'],
                'users' => ['read', 'create', 'update', 'delete'],
                'customers' => ['read', 'create', 'update', 'delete'],
                'suppliers' => ['read', 'create', 'update', 'delete'],
                'products' => ['read', 'create', 'update', 'delete'],
                'categories' => ['read', 'create', 'update', 'delete'],
                'stock' => ['read', 'create', 'update', 'delete'],
                'quotations' => ['read', 'create', 'update', 'delete', 'approve', 'reject'],
                'sales_orders' => ['read', 'create', 'update', 'delete'],
                'invoices' => ['read', 'create', 'update', 'delete'],
                'approvals' => ['read', 'approve', 'reject'],
                'reports' => ['read'],
                'settings' => ['read', 'update'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.read'
                    ],
                    [
                        'title' => 'Manajemen User',
                        'path' => '/users',
                        'icon' => 'bi-people',
                        'permission' => 'users.read'
                    ],
                    [
                        'title' => 'Customers',
                        'path' => '/customers',
                        'icon' => 'bi-building',
                        'permission' => 'customers.read'
                    ],
                    [
                        'title' => 'Suppliers',
                        'path' => '/suppliers',
                        'icon' => 'bi-truck',
                        'permission' => 'suppliers.read'
                    ],
                    [
                        'title' => 'Products',
                        'path' => '/products',
                        'icon' => 'bi-box',
                        'permission' => 'products.read'
                    ],
                    [
                        'title' => 'Stock',
                        'path' => '/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'stock.read'
                    ],
                    [
                        'title' => 'Quotations',
                        'path' => '/quotations',
                        'icon' => 'bi-file-text',
                        'permission' => 'quotations.read'
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read'
                    ],
                    [
                        'title' => 'Invoices',
                        'path' => '/invoices',
                        'icon' => 'bi-receipt',
                        'permission' => 'invoices.read'
                    ],
                    [
                        'title' => 'Approvals',
                        'path' => '/approvals',
                        'icon' => 'bi-check-square',
                        'permission' => 'approvals.read'
                    ],
                    [
                        'title' => 'Laporan',
                        'path' => '/reports',
                        'icon' => 'bi-graph-up',
                        'permission' => 'reports.read'
                    ],
                    [
                        'title' => 'Settings',
                        'path' => '/settings',
                        'icon' => 'bi-gear',
                        'permission' => 'settings.read'
                    ]
                ]
            ],
            'Sales' => [
                'dashboard' => ['read'],
                'customers' => ['read', 'create'],
                'stock' => ['read'],
                'quotations' => ['read', 'create', 'update', 'submit', 'convert'],
                'sales_orders' => ['read'],
                'invoices' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/sales',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.read'
                    ],
                    [
                        'title' => 'Customers',
                        'path' => '/customers',
                        'icon' => 'bi-people',
                        'permission' => 'customers.read',
                        'description' => 'Kelola data pelanggan'
                    ],
                    [
                        'title' => 'Stock',
                        'path' => '/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'stock.read',
                        'description' => 'Lihat stok produk'
                    ],
                    [
                        'title' => 'Quotations',
                        'path' => '/quotations',
                        'icon' => 'bi-file-text',
                        'permission' => 'quotations.read',
                        'description' => 'Menambah, submit for approval, convert to SO'
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Kelola sales order'
                    ],
                    [
                        'title' => 'Invoices',
                        'path' => '/invoices',
                        'icon' => 'bi-receipt',
                        'permission' => 'invoices.read',
                        'description' => 'Lihat status invoice'
                    ],
                    [
                        'title' => 'Logout',
                        'path' => '/logout',
                        'icon' => 'bi-box-arrow-right',
                        'permission' => null,
                        'action' => 'logout'
                    ]
                ]
            ],
            'Gudang' => [
                'dashboard' => ['read'],
                'warehouses' => ['read', 'update'],
                'stock' => ['read', 'update'],
                'sales_orders' => ['read', 'update'],
                'delivery_orders' => ['read', 'create', 'update'],
                'goods_receipts' => ['read', 'create', 'update'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/warehouse',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.read'
                    ],
                    [
                        'title' => 'Warehouses',
                        'path' => '/warehouses',
                        'icon' => 'bi-building',
                        'permission' => 'warehouses.read',
                        'description' => 'Kelola gudang'
                    ],
                    [
                        'title' => 'Stock',
                        'path' => '/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'stock.read',
                        'description' => 'Kelola stok barang'
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Proses sales order'
                    ],
                    [
                        'title' => 'Delivery Orders',
                        'path' => '/delivery-orders',
                        'icon' => 'bi-truck',
                        'permission' => 'delivery_orders.read',
                        'description' => 'Kelola surat jalan'
                    ],
                    [
                        'title' => 'Goods Receipts',
                        'path' => '/goods-receipts',
                        'icon' => 'bi-receipt-cutoff',
                        'permission' => 'goods_receipts.read',
                        'description' => 'Kelola penerimaan barang'
                    ],
                    [
                        'title' => 'Logout',
                        'path' => '/logout',
                        'icon' => 'bi-box-arrow-right',
                        'permission' => null,
                        'action' => 'logout'
                    ]
                ]
            ],
            'Finance' => [
                'dashboard' => ['read'],
                'customers' => ['read'],
                'sales_orders' => ['read'],
                'invoices' => ['read', 'create', 'update'],
                'payments' => ['read', 'create', 'update'],
                'reports' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/finance',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.read'
                    ],
                    [
                        'title' => 'Customers',
                        'path' => '/customers',
                        'icon' => 'bi-building',
                        'permission' => 'customers.read',
                        'description' => 'Kelola data pelanggan'
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Lihat sales order'
                    ],
                    [
                        'title' => 'Invoices',
                        'path' => '/invoices',
                        'icon' => 'bi-receipt',
                        'permission' => 'invoices.read',
                        'description' => 'Kelola invoice'
                    ],
                    [
                        'title' => 'Payments',
                        'path' => '/payments',
                        'icon' => 'bi-credit-card',
                        'permission' => 'payments.read',
                        'description' => 'Kelola pembayaran'
                    ],
                    [
                        'title' => 'Reports',
                        'path' => '/reports',
                        'icon' => 'bi-graph-up',
                        'permission' => 'reports.read',
                        'description' => 'Lihat laporan keuangan'
                    ],
                    [
                        'title' => 'Logout',
                        'path' => '/logout',
                        'icon' => 'bi-box-arrow-right',
                        'permission' => null,
                        'action' => 'logout'
                    ]
                ]
            ]
        ];

        return $roles[$role] ?? $roles['Sales']; // Default to Sales if role not found
    }

    /**
     * Check if user has specific permission
     */
    public function checkPermission(Request $request, $permission)
    {
        $user = $request->user();

        // Get role name - handle both string and object
        $roleName = is_string($user->role) ? $user->role : $user->role->name;

        $permissions = $this->getRolePermissions($roleName);

        $hasPermission = $this->hasPermission($permission, $permissions);

        return response()->json([
            'has_permission' => $hasPermission
        ]);
    }

    /**
     * Check permission helper
     */
    private function hasPermission($permission, $permissions)
    {
        $parts = explode('.', $permission);
        if (count($parts) < 2) {
            return false;
        }

        $resource = $parts[0];
        $action = $parts[1];

        return isset($permissions[$resource]) && in_array($action, $permissions[$resource]);
    }
}
