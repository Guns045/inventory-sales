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
                'users.read',
                'users.create',
                'users.update',
                'users.delete',
                'roles.read',
                'roles.create',
                'roles.update',
                'roles.delete',
                'manage_roles'
            ],
            'Dashboard' => [
                'dashboard.read',
                'dashboard.sales',
                'dashboard.warehouse',
                'dashboard.finance'
            ],
            'Product Management' => [
                'products.read',
                'products.create',
                'products.update',
                'products.delete',
                'categories.read',
                'categories.create',
                'categories.update',
                'categories.delete'
            ],
            'Inventory Management' => [
                'product-stock.read',
                'product-stock.create',
                'product-stock.update',
                'product-stock.delete',
                'warehouses.read',
                'warehouses.create',
                'warehouses.update',
                'warehouses.delete',
                'warehouse-transfers.read',
                'warehouse-transfers.create',
                'warehouse-transfers.update',
                'warehouse-transfers.delete'
            ],
            'Sales' => [
                'customers.read',
                'customers.create',
                'customers.update',
                'customers.delete',
                'quotations.read',
                'quotations.create',
                'quotations.update',
                'quotations.delete',
                'quotations.submit',
                'quotations.convert',
                'quotations.approve',
                'quotations.reject',
                'sales-orders.read',
                'sales-orders.create',
                'sales-orders.update',
                'sales-orders.delete'
            ],
            'Sales Returns' => [
                'sales-returns.read',
                'sales-returns.create',
                'sales-returns.update',
                'sales-returns.delete',
                'sales-returns.approve',
                'sales-returns.reject'
            ],
            'Purchasing' => [
                'suppliers.read',
                'suppliers.create',
                'suppliers.update',
                'suppliers.delete',
                'purchase-orders.read',
                'purchase-orders.create',
                'purchase-orders.update',
                'purchase-orders.delete',
                'goods-receipts.read',
                'goods-receipts.create',
                'goods-receipts.update',
                'goods-receipts.delete'
            ],
            'Fulfillment' => [
                'picking-lists.read',
                'picking-lists.create',
                'picking-lists.update',
                'picking-lists.delete',
                'picking-lists.complete',
                'picking-lists.print',
                'delivery-orders.read',
                'delivery-orders.create',
                'delivery-orders.update',
                'delivery-orders.delete'
            ],
            'Finance' => [
                'invoices.read',
                'invoices.create',
                'invoices.update',
                'invoices.delete',
                'payments.read',
                'payments.create',
                'payments.update',
                'payments.delete',
                'credit-notes.read',
                'credit-notes.create'
            ],
            'Reports & Settings' => [
                'reports.read',
                'settings.read'
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
