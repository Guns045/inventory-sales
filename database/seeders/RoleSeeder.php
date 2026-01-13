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

        // Truncate permission tables to avoid guard mismatch issues
        // Truncate permission tables to avoid guard mismatch issues
        if (config('database.default') === 'sqlite') {
            \DB::statement('PRAGMA foreign_keys = OFF;');
        } else {
            \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        }

        \DB::table('role_has_permissions')->truncate();
        \DB::table('model_has_roles')->truncate();
        \DB::table('model_has_permissions')->truncate();
        \DB::table('roles')->truncate();
        \DB::table('permissions')->truncate();

        if (config('database.default') === 'sqlite') {
            \DB::statement('PRAGMA foreign_keys = ON;');
        } else {
            \DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }

        // Load menu config to get all permissions
        $menuConfig = Config::get('menu');
        $allPermissions = $this->extractPermissions($menuConfig);

        // Create permissions
        foreach ($allPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'sanctum']);
        }

        // Explicitly create dashboard permissions if not exists
        Permission::firstOrCreate(['name' => 'dashboard.sales', 'guard_name' => 'sanctum']);
        Permission::firstOrCreate(['name' => 'dashboard.warehouse', 'guard_name' => 'sanctum']);
        Permission::firstOrCreate(['name' => 'dashboard.finance', 'guard_name' => 'sanctum']);

        // Create Roles and Assign Permissions

        // 1. Super Admin
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'sanctum']);
        $superAdmin->givePermissionTo(Permission::all());

        // 2. Admin (Access to most, but maybe restricted from some system settings if needed)
        // For now, giving full access similar to Super Admin but conceptually different
        $admin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'sanctum']);
        $admin->givePermissionTo(Permission::all());

        // 3. Sales
        $sales = Role::firstOrCreate(['name' => 'Sales', 'guard_name' => 'sanctum']);
        $salesPermissions = [
            'dashboard.read',
            'dashboard.sales', // Add specific dashboard permission
            'customers.read',
            'customers.create',
            'customers.update',
            'quotations.read',
            'quotations.create',
            'quotations.update',
            'quotations.submit',
            'quotations.convert',
            'sales-orders.read',
            'sales-returns.read',
            'sales-returns.create',
            'products.read',
            'product-stock.read',
            'invoices.read',
            'payments.read'
        ];
        $this->syncPermissionsToRole($sales, $salesPermissions);

        // 4. Warehouse
        $warehouse = Role::firstOrCreate(['name' => 'Warehouse', 'guard_name' => 'sanctum']);
        $warehousePermissions = [
            'dashboard.read',
            'dashboard.warehouse',
            'products.read',
            'products.create',
            'products.update',
            'suppliers.read',
            'suppliers.create',
            'suppliers.update',
            'purchase-orders.read',
            'purchase-orders.create',
            'purchase-orders.update',
            'goods-receipts.read',
            'goods-receipts.create',
            'goods-receipts.update',
            'picking-lists.read',
            'picking-lists.create',
            'picking-lists.update',
            'picking-lists.complete',
            'delivery-orders.read',
            'delivery-orders.create',
            'delivery-orders.update',
            'sales-returns.read', // To see returns coming in
            'warehouse-transfers.read',
            'warehouse-transfers.create',
            'warehouse-transfers.update',
            'product-stock.read',
            'warehouses.read'
        ];
        $this->syncPermissionsToRole($warehouse, $warehousePermissions);

        // 5. Finance
        $finance = Role::firstOrCreate(['name' => 'Finance', 'guard_name' => 'sanctum']);
        $financePermissions = [
            'dashboard.read',
            'dashboard.finance',
            'customers.read',
            'customers.update',
            'sales-orders.read',
            'sales-returns.read',
            'sales-returns.approve', // Finance might need to approve for refund
            'purchase-orders.read',
            'invoices.read',
            'invoices.create',
            'invoices.update',
            'payments.read',
            'payments.create',
            'payments.update',
            'reports.read'
        ];
        $this->syncPermissionsToRole($finance, $financePermissions);
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
        $resources = ['users', 'roles', 'products', 'product-stock', 'customers', 'suppliers', 'quotations', 'sales-orders', 'sales-returns', 'purchase-orders', 'goods-receipts', 'delivery-orders', 'invoices', 'payments', 'warehouses', 'warehouse-transfers', 'picking-lists'];
        foreach ($resources as $resource) {
            $permissions[] = "{$resource}.create";
            $permissions[] = "{$resource}.update";
            $permissions[] = "{$resource}.delete";
            $permissions[] = "{$resource}.read"; // Ensure read permission is created
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
            if ($resource === 'sales-returns') {
                $permissions[] = 'sales-returns.approve';
                $permissions[] = 'sales-returns.reject';
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