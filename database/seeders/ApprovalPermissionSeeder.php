<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class ApprovalPermissionSeeder extends Seeder
{
    public function run()
    {
        // Create or find the permission
        $permission = Permission::firstOrCreate(
            ['name' => 'dashboard.approval'],
            [
                'guard_name' => 'web',
                'description' => 'Access to approval dashboard'
            ]
        );

        // Get Admin role and give permission
        $adminRole = Role::where('name', 'Admin')->first();
        if ($adminRole) {
            $adminRole->givePermissionTo($permission);
            $this->command->info('Added dashboard.approval permission to Admin role');
        }

        $this->command->info('Permission dashboard.approval created/updated successfully');
    }
}