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

        $permissionsToRevoke = [
            'view_products',
            'create_products',
            'edit_products',
            'delete_products',
            'view_company_settings',
            'edit_company_settings',
            'manage_roles',
            'view_users',
            'create_users',
            'edit_users',
            'delete_users'
        ];

        $guards = ['web', 'sanctum'];

        foreach ($guards as $guard) {
            $role = Role::where('name', 'Admin')->where('guard_name', $guard)->first();
            if ($role) {
                foreach ($permissionsToRevoke as $permissionName) {
                    try {
                        // Check if permission exists for this guard
                        $permission = Permission::where('name', $permissionName)->where('guard_name', $guard)->first();
                        if ($permission && $role->hasPermissionTo($permissionName)) {
                            $role->revokePermissionTo($permissionName);
                        }
                    } catch (\Exception $e) {
                        // Ignore if permission doesn't exist
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We don't restore permissions in down()
    }
};
