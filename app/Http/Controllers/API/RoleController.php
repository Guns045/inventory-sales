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
            'Super Admin' => [
                'dashboard' => ['read', 'create', 'update', 'delete'],
                'dashboard.sales' => ['read', 'create', 'update', 'delete'],
                'dashboard.approval' => ['read', 'create', 'update', 'delete'],
                'dashboard.warehouse' => ['read', 'create', 'update', 'delete'],
                'dashboard.finance' => ['read', 'create', 'update', 'delete'],
                'users' => ['read', 'create', 'update', 'delete'],
                'customers' => ['read', 'create', 'update', 'delete'],
                'suppliers' => ['read', 'create', 'update', 'delete'],
                'products' => ['read', 'create', 'update', 'delete'],
                'categories' => ['read', 'create', 'update', 'delete'],
                'stock' => ['read', 'create', 'update', 'delete'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'warehouse-transfers' => ['read', 'create', 'update', 'delete'],
                'warehouses' => ['read', 'create', 'update', 'delete'],
                'quotations' => ['read', 'create', 'update', 'delete', 'approve', 'reject', 'submit', 'convert'],
                'sales_orders' => ['read', 'create', 'update', 'delete'],
                'delivery_orders' => ['read', 'create', 'update', 'delete'],
                'invoices' => ['read', 'create', 'update', 'delete'],
                'payments' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
                'goods_receipts' => ['read', 'create', 'update'],
                'approvals' => ['read', 'approve', 'reject'],
                'reports' => ['read', 'create', 'update', 'delete'],
                'settings' => ['read', 'update'],
                'activity-logs' => ['read'],
                'notifications' => ['read', 'create', 'update', 'delete'],
                'company-settings' => ['read', 'update', 'upload-logo', 'delete-logo'],
                'approval-levels' => ['read', 'create', 'update', 'delete'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/main',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.read',
                        'children' => [
                            [
                                'title' => 'Dashboard Monitoring',
                                'path' => '/dashboard/main',
                                'icon' => 'bi-activity',
                                'permission' => 'dashboard.read'
                            ],
                            [
                                'title' => 'Dashboard Approval',
                                'path' => '/dashboard/approval',
                                'icon' => 'bi-check-square',
                                'permission' => 'approvals.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Sales',
                        'path' => '/dashboard/sales',
                        'icon' => 'bi-cart3',
                        'permission' => 'quotations.read',
                        'children' => [
                            [
                                'title' => 'Customer',
                                'path' => '/dashboard/customers',
                                'icon' => 'bi-building',
                                'permission' => 'customers.read'
                            ],
                            [
                                'title' => 'Quotation',
                                'path' => '/dashboard/quotations',
                                'icon' => 'bi-file-text',
                                'permission' => 'quotations.read'
                            ],
                            [
                                'title' => 'Sales Orders',
                                'path' => '/dashboard/sales-orders',
                                'icon' => 'bi-cart-check',
                                'permission' => 'sales_orders.read'
                            ],
                              ]
                    ],
                    [
                        'title' => 'Inventory',
                        'path' => '/dashboard/inventory',
                        'icon' => 'bi-boxes',
                        'permission' => 'products.read',
                        'children' => [
                            [
                                'title' => 'Supplier',
                                'path' => '/dashboard/suppliers',
                                'icon' => 'bi-truck',
                                'permission' => 'suppliers.read'
                            ],
                            [
                                'title' => 'Product',
                                'path' => '/dashboard/products',
                                'icon' => 'bi-box',
                                'permission' => 'products.read'
                            ],
                            [
                                'title' => 'On Hand Stock',
                                'path' => '/dashboard/stock',
                                'icon' => 'bi-archive',
                                'permission' => 'stock.read'
                            ],
                            [
                                'title' => 'Warehouse',
                                'path' => '/dashboard/warehouses',
                                'icon' => 'bi-building',
                                'permission' => 'warehouses.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Purchased',
                        'path' => '/dashboard/purchased',
                        'icon' => 'bi-bag-check',
                        'permission' => 'goods_receipts.read',
                        'children' => [
                            [
                                'title' => 'Goods Receipt',
                                'path' => '/dashboard/goods-receipts',
                                'icon' => 'bi-receipt-cutoff',
                                'permission' => 'goods_receipts.read'
                            ],
                            [
                                'title' => 'Goods Issue',
                                'path' => '/dashboard/goods-issue',
                                'icon' => 'bi-box-arrow-left',
                                'permission' => 'stock.update'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Finance',
                        'path' => '/dashboard/finance',
                        'icon' => 'bi-credit-card',
                        'permission' => 'invoices.read',
                        'children' => [
                            [
                                'title' => 'Invoice',
                                'path' => '/dashboard/invoices',
                                'icon' => 'bi-receipt',
                                'permission' => 'invoices.read'
                            ],
                            [
                                'title' => 'Payments',
                                'path' => '/dashboard/payments',
                                'icon' => 'bi-credit-card',
                                'permission' => 'payments.read'
                            ],
                            [
                                'title' => 'Reports',
                                'path' => '/dashboard/reports',
                                'icon' => 'bi-graph-up',
                                'permission' => 'reports.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Warehouse Operations',
                        'path' => '/dashboard/warehouse-ops',
                        'icon' => 'bi-truck',
                        'permission' => 'delivery_orders.read',
                        'children' => [
                            [
                                'title' => 'Warehouse Transfers',
                                'path' => '/dashboard/warehouse-transfers',
                                'icon' => 'bi-arrow-left-right',
                                'permission' => 'warehouse-transfers.read'
                            ],
                            [
                                'title' => 'Delivery Order',
                                'path' => '/dashboard/delivery-orders',
                                'icon' => 'bi-truck',
                                'permission' => 'delivery_orders.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'System Management',
                        'path' => '/dashboard/system',
                        'icon' => 'bi-gear',
                        'permission' => 'users.read',
                        'children' => [
                            [
                                'title' => 'Users',
                                'path' => '/dashboard/users',
                                'icon' => 'bi-people',
                                'permission' => 'users.read'
                            ],
                            [
                                'title' => 'Roles & Permissions',
                                'path' => '/dashboard/roles',
                                'icon' => 'bi-shield-check',
                                'permission' => 'users.read'
                            ],
                            [
                                'title' => 'Activity Logs',
                                'path' => '/dashboard/activity-logs',
                                'icon' => 'bi-clock-history',
                                'permission' => 'activity-logs.read'
                            ],
                            [
                                'title' => 'Settings',
                                'path' => '/dashboard/settings',
                                'icon' => 'bi-gear',
                                'permission' => 'settings.read'
                            ]
                        ]
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
            'Admin' => [
                'dashboard' => ['read', 'create', 'update', 'delete'],
                'dashboard.sales' => ['read', 'create', 'update', 'delete'],
                'dashboard.approval' => ['read', 'create', 'update', 'delete'],
                'dashboard.warehouse' => ['read', 'create', 'update', 'delete'],
                'dashboard.finance' => ['read', 'create', 'update', 'delete'],
                'users' => ['read', 'create', 'update', 'delete'],
                'customers' => ['read', 'create', 'update', 'delete'],
                'suppliers' => ['read', 'create', 'update', 'delete'],
                'products' => ['read', 'create', 'update', 'delete'],
                'categories' => ['read', 'create', 'update', 'delete'],
                'stock' => ['read', 'create', 'update', 'delete'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'warehouse-transfers' => ['read', 'create', 'update', 'delete'],
                'warehouses' => ['read', 'create', 'update', 'delete'],
                'quotations' => ['read', 'create', 'update', 'delete', 'approve', 'reject', 'submit', 'convert'],
                'sales_orders' => ['read', 'create', 'update', 'delete'],
                'delivery_orders' => ['read', 'create', 'update', 'delete'],
                'invoices' => ['read', 'create', 'update', 'delete'],
                'payments' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
                'goods_receipts' => ['read', 'create', 'update'],
                'approvals' => ['read', 'approve', 'reject'],
                'reports' => ['read', 'create', 'update', 'delete'],
                'settings' => ['read', 'update'],
                'activity-logs' => ['read'],
                'notifications' => ['read', 'create', 'update', 'delete'],
                'company-settings' => ['read', 'update', 'upload-logo', 'delete-logo'],
                'approval-levels' => ['read', 'create', 'update', 'delete'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/main',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.read',
                        'children' => [
                            [
                                'title' => 'Dashboard Monitoring',
                                'path' => '/dashboard/main',
                                'icon' => 'bi-activity',
                                'permission' => 'dashboard.read'
                            ],
                            [
                                'title' => 'Dashboard Approval',
                                'path' => '/dashboard/approval',
                                'icon' => 'bi-check-square',
                                'permission' => 'approvals.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Sales',
                        'path' => '/dashboard/sales',
                        'icon' => 'bi-cart3',
                        'permission' => 'quotations.read',
                        'children' => [
                            [
                                'title' => 'Customer',
                                'path' => '/dashboard/customers',
                                'icon' => 'bi-building',
                                'permission' => 'customers.read'
                            ],
                            [
                                'title' => 'Quotation',
                                'path' => '/dashboard/quotations',
                                'icon' => 'bi-file-text',
                                'permission' => 'quotations.read'
                            ],
                            [
                                'title' => 'Sales Orders',
                                'path' => '/dashboard/sales-orders',
                                'icon' => 'bi-cart-check',
                                'permission' => 'sales_orders.read'
                            ],
                              ]
                    ],
                    [
                        'title' => 'Inventory',
                        'path' => '/dashboard/inventory',
                        'icon' => 'bi-boxes',
                        'permission' => 'products.read',
                        'children' => [
                            [
                                'title' => 'Supplier',
                                'path' => '/dashboard/suppliers',
                                'icon' => 'bi-truck',
                                'permission' => 'suppliers.read'
                            ],
                            [
                                'title' => 'Product',
                                'path' => '/dashboard/products',
                                'icon' => 'bi-box',
                                'permission' => 'products.read'
                            ],
                            [
                                'title' => 'On Hand Stock',
                                'path' => '/dashboard/stock',
                                'icon' => 'bi-archive',
                                'permission' => 'stock.read'
                            ],
                            [
                                'title' => 'Warehouse',
                                'path' => '/dashboard/warehouses',
                                'icon' => 'bi-building',
                                'permission' => 'warehouses.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Purchased',
                        'path' => '/dashboard/purchased',
                        'icon' => 'bi-bag-check',
                        'permission' => 'goods_receipts.read',
                        'children' => [
                            [
                                'title' => 'Goods Receipt',
                                'path' => '/dashboard/goods-receipts',
                                'icon' => 'bi-receipt-cutoff',
                                'permission' => 'goods_receipts.read'
                            ],
                            [
                                'title' => 'Goods Issue',
                                'path' => '/dashboard/goods-issue',
                                'icon' => 'bi-box-arrow-left',
                                'permission' => 'stock.update'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Finance',
                        'path' => '/dashboard/finance',
                        'icon' => 'bi-credit-card',
                        'permission' => 'invoices.read',
                        'children' => [
                            [
                                'title' => 'Invoice',
                                'path' => '/dashboard/invoices',
                                'icon' => 'bi-receipt',
                                'permission' => 'invoices.read'
                            ],
                            [
                                'title' => 'Payment',
                                'path' => '/dashboard/payments',
                                'icon' => 'bi-credit-card',
                                'permission' => 'payments.read'
                            ],
                            [
                                'title' => 'Report',
                                'path' => '/dashboard/reports',
                                'icon' => 'bi-graph-up',
                                'permission' => 'reports.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Warehouse Operations',
                        'path' => '/dashboard/warehouse-ops',
                        'icon' => 'bi-truck',
                        'permission' => 'delivery_orders.read',
                        'children' => [
                            [
                                'title' => 'Goods Receipt',
                                'path' => '/dashboard/goods-receipts',
                                'icon' => 'bi-receipt-cutoff',
                                'permission' => 'goods_receipts.read'
                            ],
                            [
                                'title' => 'Internal Transfer',
                                'path' => '/dashboard/warehouse-transfers',
                                'icon' => 'bi-arrow-left-right',
                                'permission' => 'warehouse-transfers.read'
                            ]
                        ]
                    ],
                    [
                        'title' => 'Management User',
                        'path' => '/dashboard/users',
                        'icon' => 'bi-people',
                        'permission' => 'users.read'
                    ],
                    [
                        'title' => 'Settings',
                        'path' => '/dashboard/settings',
                        'icon' => 'bi-gear',
                        'permission' => 'settings.read'
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
            'Sales' => [
                'dashboard' => ['read', 'sales'],
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
                        'permission' => 'dashboard.sales'
                    ],
                    [
                        'title' => 'Customers',
                        'path' => '/dashboard/customers',
                        'icon' => 'bi-people',
                        'permission' => 'customers.read',
                        'description' => 'Kelola data pelanggan'
                    ],
                    [
                        'title' => 'Stock',
                        'path' => '/dashboard/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'stock.read',
                        'description' => 'Lihat stok produk'
                    ],
                    [
                        'title' => 'Quotations',
                        'path' => '/dashboard/quotations',
                        'icon' => 'bi-file-text',
                        'permission' => 'quotations.read',
                        'description' => 'Menambah, submit for approval, convert to SO'
                    ],
                      [
                        'title' => 'Invoices',
                        'path' => '/dashboard/invoices',
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
            'Sales Team' => [
                'dashboard' => ['read', 'sales'],
                'customers' => ['read', 'create', 'update'],
                'stock' => ['read'],
                'quotations' => ['read', 'create', 'update', 'submit', 'convert'],
                'sales_orders' => ['read'],
                'invoices' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/sales',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.sales',
                        'description' => 'Dashboard Sales'
                    ],
                    [
                        'title' => 'Customers',
                        'path' => '/dashboard/customers',
                        'icon' => 'bi-people',
                        'permission' => 'customers.read',
                        'description' => 'Kelola data pelanggan'
                    ],
                    [
                        'title' => 'Stock',
                        'path' => '/dashboard/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'stock.read',
                        'description' => 'Lihat stok produk'
                    ],
                    [
                        'title' => 'Quotations',
                        'path' => '/dashboard/quotations',
                        'icon' => 'bi-file-text',
                        'permission' => 'quotations.read',
                        'description' => 'Kelola quotation'
                    ],
                      [
                        'title' => 'Invoices',
                        'path' => '/dashboard/invoices',
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
            'Admin Jakarta' => [
                'dashboard' => ['read', 'warehouse'],
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/warehouse',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.warehouse',
                        'description' => 'Dashboard Warehouse Jakarta'
                    ],
                    [
                        'title' => 'On Hand Products',
                        'path' => '/dashboard/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'product-stock.read',
                        'description' => 'Lihat stok produk tersedia'
                    ],
                    [
                        'title' => 'Warehouse Operations',
                        'icon' => 'bi-building',
                        'children' => [
                            [
                                'title' => 'Transfers',
                                'path' => '/dashboard/warehouse-transfers',
                                'icon' => 'bi-arrow-left-right',
                                'permission' => 'transfers.read',
                                'description' => 'Transfer antar gudang'
                            ],
                            [
                                'title' => 'Goods Receipt',
                                'path' => '/dashboard/goods-receipts',
                                'icon' => 'bi-receipt-cutoff',
                                'permission' => 'goods_receipts.read',
                                'description' => 'Penerimaan barang'
                            ],
                            [
                                'title' => 'Delivery Orders',
                                'path' => '/dashboard/delivery-orders',
                                'icon' => 'bi-truck',
                                'permission' => 'delivery_orders.read',
                                'description' => 'Pengiriman barang'
                            ],
                              ]
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/dashboard/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Lihat sales orders'
                    ],
                    [
                        'title' => 'Reports',
                        'path' => '/dashboard/reports',
                        'icon' => 'bi-file-bar-graph',
                        'permission' => 'reports.read',
                        'description' => 'Lihat laporan'
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
            'Admin Makassar' => [
                'dashboard' => ['read', 'warehouse'],
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/warehouse',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.warehouse',
                        'description' => 'Dashboard Warehouse Makassar'
                    ],
                    [
                        'title' => 'On Hand Products',
                        'path' => '/dashboard/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'product-stock.read',
                        'description' => 'Lihat stok produk tersedia'
                    ],
                    [
                        'title' => 'Warehouse Operations',
                        'icon' => 'bi-building',
                        'children' => [
                            [
                                'title' => 'Transfers',
                                'path' => '/dashboard/warehouse-transfers',
                                'icon' => 'bi-arrow-left-right',
                                'permission' => 'transfers.read',
                                'description' => 'Transfer antar gudang'
                            ],
                            [
                                'title' => 'Goods Receipt',
                                'path' => '/dashboard/goods-receipts',
                                'icon' => 'bi-receipt-cutoff',
                                'permission' => 'goods_receipts.read',
                                'description' => 'Penerimaan barang'
                            ],
                            [
                                'title' => 'Delivery Orders',
                                'path' => '/dashboard/delivery-orders',
                                'icon' => 'bi-truck',
                                'permission' => 'delivery_orders.read',
                                'description' => 'Pengiriman barang'
                            ],
                              ]
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/dashboard/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Lihat sales orders'
                    ],
                    [
                        'title' => 'Reports',
                        'path' => '/dashboard/reports',
                        'icon' => 'bi-file-bar-graph',
                        'permission' => 'reports.read',
                        'description' => 'Lihat laporan'
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
            'Manager Jakarta' => [
                'dashboard' => ['read', 'warehouse'],
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/warehouse',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.warehouse',
                        'description' => 'Dashboard Manager Jakarta'
                    ],
                    [
                        'title' => 'On Hand Products',
                        'path' => '/dashboard/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'product-stock.read',
                        'description' => 'Lihat stok produk tersedia'
                    ],
                    [
                        'title' => 'Warehouse Operations',
                        'icon' => 'bi-building',
                        'children' => [
                            [
                                'title' => 'Transfers',
                                'path' => '/dashboard/warehouse-transfers',
                                'icon' => 'bi-arrow-left-right',
                                'permission' => 'transfers.read',
                                'description' => 'Transfer antar gudang'
                            ],
                            [
                                'title' => 'Goods Receipt',
                                'path' => '/dashboard/goods-receipts',
                                'icon' => 'bi-receipt-cutoff',
                                'permission' => 'goods_receipts.read',
                                'description' => 'Penerimaan barang'
                            ],
                            [
                                'title' => 'Delivery Orders',
                                'path' => '/dashboard/delivery-orders',
                                'icon' => 'bi-truck',
                                'permission' => 'delivery_orders.read',
                                'description' => 'Pengiriman barang'
                            ],
                              ]
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/dashboard/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Lihat sales orders'
                    ],
                    [
                        'title' => 'Reports',
                        'path' => '/dashboard/reports',
                        'icon' => 'bi-file-bar-graph',
                        'permission' => 'reports.read',
                        'description' => 'Lihat laporan'
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
            'Manager Makassar' => [
                'dashboard' => ['read', 'warehouse'],
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/warehouse',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.warehouse',
                        'description' => 'Dashboard Manager Makassar'
                    ],
                    [
                        'title' => 'On Hand Products',
                        'path' => '/dashboard/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'product-stock.read',
                        'description' => 'Lihat stok produk tersedia'
                    ],
                    [
                        'title' => 'Warehouse Operations',
                        'icon' => 'bi-building',
                        'children' => [
                            [
                                'title' => 'Transfers',
                                'path' => '/dashboard/warehouse-transfers',
                                'icon' => 'bi-arrow-left-right',
                                'permission' => 'transfers.read',
                                'description' => 'Transfer antar gudang'
                            ],
                            [
                                'title' => 'Goods Receipt',
                                'path' => '/dashboard/goods-receipts',
                                'icon' => 'bi-receipt-cutoff',
                                'permission' => 'goods_receipts.read',
                                'description' => 'Penerimaan barang'
                            ],
                            [
                                'title' => 'Delivery Orders',
                                'path' => '/dashboard/delivery-orders',
                                'icon' => 'bi-truck',
                                'permission' => 'delivery_orders.read',
                                'description' => 'Pengiriman barang'
                            ],
                              ]
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/dashboard/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Lihat sales orders'
                    ],
                    [
                        'title' => 'Reports',
                        'path' => '/dashboard/reports',
                        'icon' => 'bi-file-bar-graph',
                        'permission' => 'reports.read',
                        'description' => 'Lihat laporan'
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
                'dashboard.warehouse' => ['read'],
                'warehouses' => ['read', 'update'],
                'stock' => ['read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'warehouse-transfers' => ['read', 'create', 'update'],
                'sales_orders' => ['read', 'update'],
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
                'delivery_orders' => ['read', 'create', 'update'],
                'goods_receipts' => ['read', 'create', 'update'],
                'activity-logs' => ['read'],
                'menu_items' => [
                    [
                        'title' => 'Dashboard',
                        'path' => '/dashboard/warehouse',
                        'icon' => 'bi-speedometer2',
                        'permission' => 'dashboard.warehouse',
                        'description' => 'Dashboard Gudang'
                    ],
                    [
                        'title' => 'Warehouses',
                        'path' => '/dashboard/warehouses',
                        'icon' => 'bi-building',
                        'permission' => 'warehouses.read',
                        'description' => 'Kelola gudang'
                    ],
                    [
                        'title' => 'Stock',
                        'path' => '/dashboard/stock',
                        'icon' => 'bi-archive',
                        'permission' => 'stock.read',
                        'description' => 'Kelola stok barang'
                    ],
                    [
                        'title' => 'Internal Transfer',
                        'path' => '/dashboard/warehouse-transfers',
                        'icon' => 'bi-arrow-left-right',
                        'permission' => 'warehouse-transfers.read',
                        'description' => 'Kelola transfer antar gudang'
                    ],
                    [
                        'title' => 'Delivery Orders',
                        'path' => '/dashboard/delivery-orders',
                        'icon' => 'bi-truck',
                        'permission' => 'delivery_orders.read',
                        'description' => 'Kelola surat jalan'
                    ],
                    [
                        'title' => 'Goods Receipts',
                        'path' => '/dashboard/goods-receipts',
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
                        'path' => '/dashboard/customers',
                        'icon' => 'bi-building',
                        'permission' => 'customers.read',
                        'description' => 'Kelola data pelanggan'
                    ],
                    [
                        'title' => 'Sales Orders',
                        'path' => '/dashboard/sales-orders',
                        'icon' => 'bi-cart-check',
                        'permission' => 'sales_orders.read',
                        'description' => 'Lihat sales order'
                    ],
                    [
                        'title' => 'Invoices',
                        'path' => '/dashboard/invoices',
                        'icon' => 'bi-receipt',
                        'permission' => 'invoices.read',
                        'description' => 'Kelola invoice'
                    ],
                    [
                        'title' => 'Payments',
                        'path' => '/dashboard/payments',
                        'icon' => 'bi-credit-card',
                        'permission' => 'payments.read',
                        'description' => 'Kelola pembayaran'
                    ],
                    [
                        'title' => 'Reports',
                        'path' => '/dashboard/reports',
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
