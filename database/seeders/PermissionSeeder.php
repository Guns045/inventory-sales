<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define permission modules as per implementation plan
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
                'edit_payments',
                'credit-notes.read',
                'credit-notes.create'
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

        // Create all permissions
        foreach ($permissionModules as $module => $permissions) {
            foreach ($permissions as $permission) {
                Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            }
        }

        // Assign all permissions to Super Admin
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::where('guard_name', 'web')->get());

        $this->command->info('Permissions created and assigned to Super Admin successfully.');
    }

    /**
     * Sync existing roles with their current permissions
     */
    private function syncExistingRoles()
    {
        $roles = \App\Models\Role::with('users')->get();

        foreach ($roles as $role) {
            // Map existing JSON permissions to new permission names
            $permissions = $this->mapLegacyPermissions($role);

            // Get or create Spatie role
            $spatieRole = Role::firstOrCreate([
                'name' => $role->name,
                'guard_name' => 'web'
            ]);

            // Only sync permissions if we have them
            if (!empty($permissions)) {
                $spatieRole->syncPermissions($permissions);
            }

            // Assign Spatie role to all users who have this role
            foreach ($role->users as $user) {
                if (!$user->hasRole($spatieRole)) {
                    $user->assignRole($spatieRole);
                }
            }
        }
    }

    /**
     * Map legacy JSON permissions to new permission names
     */
    private function mapLegacyPermissions($role)
    {
        $legacyPermissions = [];
        if (!empty($role->permissions)) {
            $legacyPermissions = is_array($role->permissions)
                ? $role->permissions
                : json_decode($role->permissions, true) ?? [];
        }

        $newPermissions = [];

        // Map legacy permissions to new format
        foreach ($legacyPermissions as $resource => $actions) {
            if (!is_array($actions))
                continue;

            foreach ($actions as $action) {
                switch ($resource) {
                    case 'users':
                        if ($action === 'read')
                            $newPermissions[] = 'view_users';
                        if ($action === 'create')
                            $newPermissions[] = 'create_users';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_users';
                        if ($action === 'delete')
                            $newPermissions[] = 'delete_users';
                        break;
                    case 'products':
                        if ($action === 'read')
                            $newPermissions[] = 'view_products';
                        if ($action === 'create')
                            $newPermissions[] = 'create_products';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_products';
                        if ($action === 'delete')
                            $newPermissions[] = 'delete_products';
                        break;
                    case 'warehouses':
                        if ($action === 'read')
                            $newPermissions[] = 'view_warehouses';
                        if ($action === 'create')
                            $newPermissions[] = 'create_warehouses';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_warehouses';
                        break;
                    case 'quotations':
                        if ($action === 'read')
                            $newPermissions[] = 'view_quotations';
                        if ($action === 'create')
                            $newPermissions[] = 'create_quotations';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_quotations';
                        if ($action === 'approve')
                            $newPermissions[] = 'approve_quotations';
                        break;
                    case 'sales_orders':
                    case 'sales-orders':
                        if ($action === 'read')
                            $newPermissions[] = 'view_sales_orders';
                        if ($action === 'create')
                            $newPermissions[] = 'create_sales_orders';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_sales_orders';
                        break;
                    case 'purchase_orders':
                    case 'purchase-orders':
                        if ($action === 'read')
                            $newPermissions[] = 'view_purchase_orders';
                        if ($action === 'create')
                            $newPermissions[] = 'create_purchase_orders';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_purchase_orders';
                        break;
                    case 'stock_movements':
                        if ($action === 'read')
                            $newPermissions[] = 'view_stock_movements';
                        if ($action === 'create')
                            $newPermissions[] = 'adjust_stock';
                        if ($action === 'update')
                            $newPermissions[] = 'adjust_stock';
                        break;
                    case 'product-stock':
                        if ($action === 'read')
                            $newPermissions[] = 'view_stock';
                        if ($action === 'create')
                            $newPermissions[] = 'adjust_stock';
                        if ($action === 'update')
                            $newPermissions[] = 'adjust_stock';
                        break;
                    case 'invoices':
                        if ($action === 'read')
                            $newPermissions[] = 'view_invoices';
                        if ($action === 'create')
                            $newPermissions[] = 'create_invoices';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_invoices';
                        break;
                    case 'payments':
                        if ($action === 'read')
                            $newPermissions[] = 'view_payments';
                        if ($action === 'create')
                            $newPermissions[] = 'create_payments';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_payments';
                        break;
                    case 'goods_receipts':
                    case 'goods-receipts':
                        if ($action === 'read')
                            $newPermissions[] = 'view_goods_receipts';
                        if ($action === 'create')
                            $newPermissions[] = 'create_goods_receipts';
                        if ($action === 'update')
                            $newPermissions[] = 'edit_goods_receipts';
                        break;
                    case 'picking_lists':
                    case 'picking-lists':
                        if ($action === 'print')
                            $newPermissions[] = 'print_picking_list';
                        break;
                    case 'delivery_orders':
                        if ($action === 'read')
                            $newPermissions[] = 'view_stock'; // mapped to stock view
                        if ($action === 'print')
                            $newPermissions[] = 'print_delivery_order';
                        break;
                    case 'transfers':
                        if ($action === 'read')
                            $newPermissions[] = 'view_transfers';
                        if ($action === 'create')
                            $newPermissions[] = 'create_transfers';
                        if ($action === 'approve')
                            $newPermissions[] = 'approve_transfers';
                        break;
                    case 'reports':
                        if ($action === 'read')
                            $newPermissions[] = 'view_reports';
                        if ($action === 'export')
                            $newPermissions[] = 'export_reports';
                        break;
                    case 'customers':
                    case 'suppliers':
                        // These don't have direct equivalents yet, skip for now
                        break;
                }
            }
        }

        // Add specific role-based permissions
        switch ($role->name) {
            case 'Super Admin':
                // Give all permissions to Super Admin
                $allPermissions = Permission::pluck('name')->toArray();
                $newPermissions = array_unique(array_merge($newPermissions, $allPermissions));
                $newPermissions[] = 'manage_roles';
                $newPermissions[] = 'view_company_settings';
                $newPermissions[] = 'edit_company_settings';
                $newPermissions[] = 'print_quotation';
                $newPermissions[] = 'print_delivery_order';
                $newPermissions[] = 'print_purchase_order';
                $newPermissions[] = 'print_invoice';
                break;
            case 'Sales Team':
                // Sales team specific permissions
                // Customer permissions not defined yet, skip for now
                break;
            case 'Finance Team':
            case 'Finance':
                // Finance specific permissions
                $newPermissions[] = 'print_invoice';
                break;
        }

        return array_unique($newPermissions);
    }
}
