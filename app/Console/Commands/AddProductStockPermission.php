<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Permission;
use App\Models\Role;
use App\Models\PermissionRole;

class AddProductStockPermission extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:add-product-stock-permission';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Add product-stock.read permission to Sales Team role';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Adding product-stock.read permission to Sales Team role...');

        // Check if permission exists
        $permission = Permission::where('name', 'product-stock.read')->first();
        if (!$permission) {
            $this->error('Permission "product-stock.read" not found in database!');
            return 1;
        }
        $this->info("Found permission: {$permission->name} (ID: {$permission->id})");

        // Check if Sales Team role exists
        $role = Role::where('name', 'Sales Team')->first();
        if (!$role) {
            $this->error('Role "Sales Team" not found in database!');
            return 1;
        }
        $this->info("Found role: {$role->name} (ID: {$role->id})");

        // Check if permission is already assigned to role
        $existingPermission = PermissionRole::where('permission_id', $permission->id)
            ->where('role_id', $role->id)
            ->first();

        if ($existingPermission) {
            $this->info('Permission already assigned to Sales Team role!');
            return 0;
        }

        // Assign permission to role
        PermissionRole::create([
            'permission_id' => $permission->id,
            'role_id' => $role->id,
        ]);

        $this->info('Successfully assigned product-stock.read permission to Sales Team role!');
        return 0;
    }
}
