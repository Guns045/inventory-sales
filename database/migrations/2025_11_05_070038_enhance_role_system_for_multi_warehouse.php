<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('description');
            $table->string('warehouse_access_level')->default('none')->after('permissions'); // none, specific, all
            $table->boolean('can_approve_transfers')->default(false)->after('warehouse_access_level');
            $table->boolean('can_manage_all_warehouses')->default(false)->after('can_approve_transfers');
            $table->integer('hierarchy_level')->default(0)->after('can_manage_all_warehouses');
        });

        // Update existing roles with default permissions
        DB::table('roles')->where('name', 'Admin')->update([
            'permissions' => json_encode([
                'users' => ['create', 'read', 'update', 'delete'],
                'warehouses' => ['create', 'read', 'update', 'delete'],
                'products' => ['create', 'read', 'update', 'delete'],
                'quotations' => ['create', 'read', 'update', 'delete', 'approve'],
                'sales_orders' => ['create', 'read', 'update', 'delete'],
                'transfers' => ['create', 'read', 'update', 'delete', 'approve'],
                'invoices' => ['create', 'read', 'update', 'delete'],
                'reports' => ['read']
            ]),
            'warehouse_access_level' => 'all',
            'can_approve_transfers' => true,
            'can_manage_all_warehouses' => true,
            'hierarchy_level' => 100
        ]);

        DB::table('roles')->where('name', 'Sales')->update([
            'permissions' => json_encode([
                'customers' => ['create', 'read', 'update'],
                'quotations' => ['create', 'read', 'update'],
                'sales_orders' => ['create', 'read', 'update'],
                'products' => ['read'],
                'warehouses' => ['read']
            ]),
            'warehouse_access_level' => 'specific',
            'hierarchy_level' => 30
        ]);

        DB::table('roles')->where('name', 'Gudang')->update([
            'permissions' => json_encode([
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read'],
                'picking_lists' => ['create', 'read', 'update'],
                'delivery_orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read'],
                'goods_receipts' => ['create', 'read', 'update']
            ]),
            'warehouse_access_level' => 'specific',
            'can_approve_transfers' => true,
            'hierarchy_level' => 40
        ]);

        DB::table('roles')->where('name', 'Finance')->update([
            'permissions' => json_encode([
                'quotations' => ['read'],
                'sales_orders' => ['read'],
                'invoices' => ['create', 'read', 'update'],
                'payments' => ['create', 'read', 'update'],
                'reports' => ['read']
            ]),
            'warehouse_access_level' => 'none',
            'hierarchy_level' => 50
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn(['permissions', 'warehouse_access_level', 'can_approve_transfers', 'can_manage_all_warehouses', 'hierarchy_level']);
        });
    }
};
