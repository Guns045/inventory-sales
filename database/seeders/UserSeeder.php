<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get roles from RoleSeeder
        $superadminRole = Role::where('name', 'Super Admin')->first();
        $adminRole = Role::where('name', 'Admin')->first();
        $salesRole = Role::where('name', 'Sales')->first();
        $warehouseRole = Role::where('name', 'Warehouse')->first();
        $financeRole = Role::where('name', 'Finance')->first();

        // Fallback to create simple roles if not found
        if (!$superadminRole) {
            $superadminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        }
        if (!$adminRole) {
            $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        }
        if (!$salesRole) {
            $salesRole = Role::firstOrCreate(['name' => 'Sales']);
        }
        if (!$warehouseRole) {
            $warehouseRole = Role::firstOrCreate(['name' => 'Warehouse']);
        }
        if (!$financeRole) {
            $financeRole = Role::firstOrCreate(['name' => 'Finance']);
        }

        // Create superadmin user
        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@example.com',
                'password' => Hash::make('password'),
            ]
        );
        $superadmin->assignRole($superadminRole);

        // Create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'email' => 'admin@example.com',
                'password' => Hash::make('password'),
            ]
        );
        $admin->assignRole($adminRole);

        // Create sample users for other roles
        $salesUser = User::firstOrCreate(
            ['email' => 'sales@example.com'],
            [
                'name' => 'Sales User',
                'email' => 'sales@example.com',
                'password' => Hash::make('password'),
            ]
        );
        $salesUser->assignRole($salesRole);

        $warehouseUser = User::firstOrCreate(
            ['email' => 'warehouse@example.com'],
            [
                'name' => 'Warehouse User',
                'email' => 'warehouse@example.com',
                'password' => Hash::make('password'),
            ]
        );
        $warehouseUser->assignRole($warehouseRole);

        $financeUser = User::firstOrCreate(
            ['email' => 'finance@example.com'],
            [
                'name' => 'Finance User',
                'email' => 'finance@example.com',
                'password' => Hash::make('password'),
            ]
        );
        $financeUser->assignRole($financeRole);
    }
}
