<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    /**
     * Get all permissions grouped by module
     */
    public function index()
    {
        $permissionModules = [
            'User Management' => [
                'view_users',
                'create_users',
                'edit_users',
                'delete_users'
            ],
            'Product Management' => [
                'view_products',
                'create_products',
                'edit_products',
                'delete_products'
            ],
            'Warehouse Management' => [
                'view_warehouses',
                'create_warehouses',
                'edit_warehouses'
            ],
            'Quotations & Sales' => [
                'view_quotations',
                'create_quotations',
                'edit_quotations',
                'approve_quotations',
                'view_sales_orders',
                'create_sales_orders',
                'edit_sales_orders'
            ],
            'Purchase Orders' => [
                'view_purchase_orders',
                'create_purchase_orders',
                'edit_purchase_orders'
            ],
            'Inventory & Stock' => [
                'view_stock',
                'adjust_stock',
                'view_stock_movements'
            ],
            'Goods Receipt' => [
                'view_goods_receipts',
                'create_goods_receipts',
                'edit_goods_receipts'
            ],
            'Invoices & Payments' => [
                'view_invoices',
                'create_invoices',
                'edit_invoices',
                'view_payments',
                'create_payments',
                'edit_payments'
            ],
            'Document Management' => [
                'print_quotation',        // Print PQ
                'print_picking_list',     // Print PL
                'print_delivery_order',   // Print DO
                'print_purchase_order',   // Print PO
                'print_invoice'          // Print PI
            ],
            'Internal Transfers' => [
                'view_transfers',
                'create_transfers',
                'approve_transfers'
            ],
            'Reports' => [
                'view_reports',
                'export_reports'
            ],
            'System Settings' => [
                'view_company_settings',
                'edit_company_settings',
                'manage_roles'
            ]
        ];

        $groupedPermissions = [];

        foreach ($permissionModules as $module => $permissions) {
            $modulePermissions = Permission::whereIn('name', $permissions)->get();

            if ($modulePermissions->isNotEmpty()) {
                $groupedPermissions[$module] = $modulePermissions->map(function ($permission) {
                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'display_name' => ucwords(str_replace('_', ' ', $permission->name))
                    ];
                });
            }
        }

        return response()->json($groupedPermissions);
    }

    /**
     * Get grouped permissions (alias for index)
     */
    public function grouped()
    {
        return $this->index();
    }

    /**
     * Store a newly created permission
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name'
        ]);

        $permission = Permission::create([
            'name' => $request->name,
            'guard_name' => 'web'
        ]);

        return response()->json($permission, 201);
    }

    /**
     * Display the specified permission
     */
    public function show($id)
    {
        $permission = Permission::findOrFail($id);
        return response()->json($permission);
    }

    /**
     * Update the specified permission
     */
    public function update(Request $request, $id)
    {
        $permission = Permission::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,' . $id
        ]);

        $permission->update([
            'name' => $request->name
        ]);

        return response()->json($permission);
    }

    /**
     * Remove the specified permission
     */
    public function destroy($id)
    {
        $permission = Permission::findOrFail($id);
        $permission->delete();

        return response()->json(['message' => 'Permission deleted successfully']);
    }

    /**
     * Get permissions for a specific role
     */
    public function getRolePermissions($roleId)
    {
        $role = Role::with('permissions')->findOrFail($roleId);

        return response()->json([
            'role' => $role,
            'permissions' => $role->permissions->pluck('name')->toArray()
        ]);
    }

    /**
     * Sync permissions for a specific role
     */
    public function syncRolePermissions(Request $request, $roleId)
    {
        $request->validate([
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name'
        ]);

        $role = Role::findOrFail($roleId);
        $role->syncPermissions($request->permissions);

        return response()->json([
            'message' => 'Permissions synced successfully',
            'permissions' => $role->permissions->pluck('name')->toArray()
        ]);
    }
}
