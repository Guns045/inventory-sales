<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Config;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Load menu config to get all permissions
        $menuConfig = Config::get('menu');
        $allPermissions = $this->extractPermissions($menuConfig);

        // Create permissions
        foreach ($allPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create Roles and Assign Permissions

        // 1. Super Admin
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->givePermissionTo(Permission::all());

        // 2. Admin (Access to most, but maybe restricted from some system settings if needed)
        // For now, giving full access similar to Super Admin but conceptually different
        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $admin->givePermissionTo(Permission::all());

        // 3. Sales
        $sales = Role::firstOrCreate(['name' => 'Sales']);
        $salesPermissions = [
            'dashboard.read',
            'customers.read',
            'customers.create',
            'customers.update',
            'quotations.read',
            'quotations.create',
            'quotations.update',
            'quotations.submit',
            'quotations.convert',
            'sales_orders.read',
            'products.read',
            'product-stock.read',
            'invoices.read',
            'payments.read'
        ];
        $this->syncPermissionsToRole($sales, $salesPermissions);

        // 4. Warehouse
        $warehouse = Role::firstOrCreate(['name' => 'Warehouse']);
        $warehousePermissions = [
            'dashboard.read',
            'products.read',
            'products.create',
            'products.update',
            'suppliers.read',
            'suppliers.create',
            'suppliers.update',
            'purchase-orders.read',
            'purchase-orders.create',
            'purchase-orders.update',
            'goods_receipts.read',
            'goods_receipts.create',
            'goods_receipts.update',
            'picking-lists.read',
            'picking-lists.create',
            'picking-lists.update',
            'picking-lists.complete',
            'delivery_orders.read',
            'delivery_orders.create',
            'delivery_orders.update',
            'warehouse-transfers.read',
            'warehouse-transfers.create',
            'warehouse-transfers.update',
            'product-stock.read',
            'product-stock.create',
            'product-stock.update',
            'warehouses.read'
        ];
        $this->syncPermissionsToRole($warehouse, $warehousePermissions);
    }

    private function extractPermissions(array $menuItems): array
    {
        $permissions = [];
        foreach ($menuItems as $item) {
            if (isset($item['permission']) && $item['permission']) {
                $permissions[] = $item['permission'];
            }
            if (isset($item['children'])) {
                $permissions = array_merge($permissions, $this->extractPermissions($item['children']));
            }
        }

        // Add CRUD variations for common resources if not explicitly in menu
        // This is a simplification; in a real app, we might define these more explicitly
        $resources = ['users', 'roles', 'products', 'customers', 'suppliers', 'quotations', 'sales_orders', 'purchase_orders', 'goods_receipts', 'delivery_orders', 'invoices', 'payments', 'warehouses', 'warehouse-transfers', 'picking-lists', 'product-stock'];
        foreach ($resources as $resource) {
            $permissions[] = "{$resource}.read";
            $permissions[] = "{$resource}.create";
            $permissions[] = "{$resource}.update";
            $permissions[] = "{$resource}.delete";
            // Add specific actions
            if ($resource === 'quotations') {
                $permissions[] = 'quotations.submit';
                $permissions[] = 'quotations.convert';
                $permissions[] = 'quotations.approve';
                $permissions[] = 'quotations.reject';
            }
            if ($resource === 'picking-lists') {
                $permissions[] = 'picking-lists.complete';
            }
        }

        return array_unique($permissions);
    }

    private function syncPermissionsToRole(Role $role, array $permissions)
    {
        $validPermissions = [];
        foreach ($permissions as $permissionName) {
            $permission = Permission::where('name', $permissionName)->first();
            if ($permission) {
                $validPermissions[] = $permission;
            }
        }
        $role->syncPermissions($validPermissions);
    }
}