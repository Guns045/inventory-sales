<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get roles from RoleSeeder
        $adminRole = Role::where('name', 'Super Admin')->first();
        $salesRole = Role::where('name', 'Sales Team')->first();
        $gudangRole = Role::where('name', 'Warehouse Staff')->first();
        $financeRole = Role::where('name', 'Finance Team')->first();

        // Fallback to create simple roles if not found
        if (!$adminRole) {
            $adminRole = Role::firstOrCreate(
                ['name' => 'Admin'],
                ['name' => 'Admin', 'description' => 'Administrator with full access']
            );
        }
        if (!$salesRole) {
            $salesRole = Role::firstOrCreate(
                ['name' => 'Sales'],
                ['name' => 'Sales', 'description' => 'Sales personnel']
            );
        }
        if (!$gudangRole) {
            $gudangRole = Role::firstOrCreate(
                ['name' => 'Gudang'],
                ['name' => 'Gudang', 'description' => 'Warehouse staff']
            );
        }
        if (!$financeRole) {
            $financeRole = Role::firstOrCreate(
                ['name' => 'Finance'],
                ['name' => 'Finance', 'description' => 'Finance personnel']
            );
        }

        // Create admin user
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Super Admin',
                'email' => 'admin@example.com',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id
            ]
        );
        
        // Create sample users for other roles
        User::firstOrCreate(
            ['email' => 'sales@example.com'],
            [
                'name' => 'Sales User',
                'email' => 'sales@example.com',
                'password' => Hash::make('password'),
                'role_id' => $salesRole->id
            ]
        );
        
        User::firstOrCreate(
            ['email' => 'gudang@example.com'],
            [
                'name' => 'Gudang User',
                'email' => 'gudang@example.com',
                'password' => Hash::make('password'),
                'role_id' => $gudangRole->id
            ]
        );
        
        User::firstOrCreate(
            ['email' => 'finance@example.com'],
            [
                'name' => 'Finance User',
                'email' => 'finance@example.com',
                'password' => Hash::make('password'),
                'role_id' => $financeRole->id
            ]
        );
    }
}
