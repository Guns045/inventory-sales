<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $newPermissions = [
            'view_customers',
            'create_customers',
            'edit_customers',
            'delete_customers',

            'view_suppliers',
            'create_suppliers',
            'edit_suppliers',
            'delete_suppliers',

            'view_sales_returns',
            'create_sales_returns',
            'edit_sales_returns',
            'approve_sales_returns',

            'view_delivery_orders',
            'create_delivery_orders',
            'edit_delivery_orders',
            'print_delivery_orders',

            'view_picking_lists',
            'create_picking_lists',
            'edit_picking_lists',
            'print_picking_lists',

            'view_dashboard',
            'view_dashboard_sales',
            'view_dashboard_warehouse',
            'view_dashboard_finance',
        ];

        // Create new permissions for both guards
        foreach ($newPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'sanctum']);
        }

        // Existing permissions that might be missing for sanctum
        $existingPermissions = [
            'view_users',
            'create_users',
            'edit_users',
            'delete_users',
            'view_products',
            'create_products',
            'edit_products',
            'delete_products',
            'view_warehouses',
            'create_warehouses',
            'edit_warehouses',
            'view_quotations',
            'create_quotations',
            'edit_quotations',
            'approve_quotations',
            'view_sales_orders',
            'create_sales_orders',
            'edit_sales_orders',
            'view_purchase_orders',
            'create_purchase_orders',
            'edit_purchase_orders',
            'view_stock',
            'adjust_stock',
            'view_stock_movements',
            'view_goods_receipts',
            'create_goods_receipts',
            'edit_goods_receipts',
            'view_invoices',
            'create_invoices',
            'edit_invoices',
            'view_payments',
            'create_payments',
            'edit_payments',
            'view_transfers',
            'create_transfers',
            'approve_transfers',
            'view_reports',
            'export_reports',
            'view_company_settings',
            'edit_company_settings',
            'manage_roles'
        ];

        // Ensure existing permissions exist for sanctum guard
        foreach ($existingPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'sanctum']);
        }

        // Assign to Super Admin
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo(Permission::where('guard_name', $superAdmin->guard_name)->get());
        }

        // Assign to Admin (if exists)
        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            // Combine all permissions we want to give to Admin
            $allAdminPermissions = array_merge($newPermissions, $existingPermissions);

            foreach ($allAdminPermissions as $perm) {
                try {
                    // Check if permission exists for this guard
                    $p = Permission::where('name', $perm)->where('guard_name', $admin->guard_name)->first();
                    if ($p) {
                        $admin->givePermissionTo($p);
                    }
                } catch (\Exception $e) {
                    // Ignore
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We don't delete permissions in down() to avoid data loss
    }
};
