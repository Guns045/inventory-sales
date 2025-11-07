<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Super Admin',
                'description' => 'Super Administrator with full system access',
                'permissions' => [
                    'users' => ['create', 'read', 'update', 'delete'],
                    'warehouses' => ['create', 'read', 'update', 'delete'],
                    'products' => ['create', 'read', 'update', 'delete'],
                    'customers' => ['create', 'read', 'update', 'delete'],
                    'suppliers' => ['create', 'read', 'update', 'delete'],
                    'quotations' => ['create', 'read', 'update', 'delete', 'approve'],
                    'sales_orders' => ['create', 'read', 'update', 'delete'],
                    'transfers' => ['create', 'read', 'update', 'delete', 'approve'],
                    'invoices' => ['create', 'read', 'update', 'delete'],
                    'payments' => ['create', 'read', 'update', 'delete'],
                    'reports' => ['read'],
                    'stock_movements' => ['create', 'read', 'update', 'delete'],
                    'picking_lists' => ['create', 'read', 'update', 'delete'],
                    'delivery_orders' => ['create', 'read', 'update', 'delete'],
                    'goods_receipts' => ['create', 'read', 'update', 'delete'],
                    'purchase_orders' => ['create', 'read', 'update', 'delete'],
                ],
                'warehouse_access_level' => 'all',
                'can_approve_transfers' => true,
                'can_manage_all_warehouses' => true,
                'hierarchy_level' => 100,
            ],
            [
                'name' => 'Warehouse Manager Gudang JKT',
                'description' => 'Manager for Jakarta warehouse operations',
                'permissions' => [
                    'products' => ['read', 'update'],
                    'warehouses' => ['read', 'update'],
                    'stock_movements' => ['create', 'read', 'update'],
                    'picking_lists' => ['create', 'read', 'update'],
                    'delivery_orders' => ['create', 'read', 'update'],
                    'transfers' => ['create', 'read', 'approve'],
                    'goods_receipts' => ['create', 'read', 'update'],
                    'quotations' => ['read'],
                    'sales_orders' => ['read'],
                    'reports' => ['read'],
                ],
                'warehouse_access_level' => 'specific',
                'can_approve_transfers' => true,
                'can_manage_all_warehouses' => false,
                'hierarchy_level' => 80,
            ],
            [
                'name' => 'Warehouse Manager Gudang MKS',
                'description' => 'Manager for Makassar warehouse operations',
                'permissions' => [
                    'products' => ['read', 'update'],
                    'warehouses' => ['read', 'update'],
                    'stock_movements' => ['create', 'read', 'update'],
                    'picking_lists' => ['create', 'read', 'update'],
                    'delivery_orders' => ['create', 'read', 'update'],
                    'transfers' => ['create', 'read', 'approve'],
                    'goods_receipts' => ['create', 'read', 'update'],
                    'quotations' => ['read'],
                    'sales_orders' => ['read'],
                    'reports' => ['read'],
                ],
                'warehouse_access_level' => 'specific',
                'can_approve_transfers' => true,
                'can_manage_all_warehouses' => false,
                'hierarchy_level' => 80,
            ],
            [
                'name' => 'Sales Team',
                'description' => 'Sales team members for customer management',
                'permissions' => [
                    'customers' => ['create', 'read', 'update'],
                    'quotations' => ['create', 'read', 'update'],
                    'sales_orders' => ['create', 'read', 'update'],
                    'products' => ['read'],
                    'warehouses' => ['read'],
                    'reports' => ['read'],
                ],
                'warehouse_access_level' => 'specific',
                'can_approve_transfers' => false,
                'can_manage_all_warehouses' => false,
                'hierarchy_level' => 40,
            ],
            [
                'name' => 'Finance Team',
                'description' => 'Finance team for billing and payments',
                'permissions' => [
                    'quotations' => ['read'],
                    'sales_orders' => ['read'],
                    'invoices' => ['create', 'read', 'update'],
                    'payments' => ['create', 'read', 'update'],
                    'reports' => ['read'],
                    'customers' => ['read'],
                ],
                'warehouse_access_level' => 'none',
                'can_approve_transfers' => false,
                'can_manage_all_warehouses' => false,
                'hierarchy_level' => 60,
            ],
            [
                'name' => 'Warehouse Staff',
                'description' => 'General warehouse operations staff',
                'permissions' => [
                    'products' => ['read'],
                    'warehouses' => ['read'],
                    'stock_movements' => ['create', 'read'],
                    'picking_lists' => ['create', 'read', 'update'],
                    'delivery_orders' => ['create', 'read', 'update'],
                    'goods_receipts' => ['create', 'read', 'update'],
                    'transfers' => ['create', 'read'],
                    'reports' => ['read'],
                ],
                'warehouse_access_level' => 'specific',
                'can_approve_transfers' => false,
                'can_manage_all_warehouses' => false,
                'hierarchy_level' => 30,
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['name' => $role['name']],
                $role
            );
        }
    }
}