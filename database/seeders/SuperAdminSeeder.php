<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure Super Admin role exists
        $role = Role::firstOrCreate(['name' => 'Super Admin']);

        // Create Super Admin User
        $user = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'), // Default password
                'is_active' => true,
                'can_access_multiple_warehouses' => true,
                'email_verified_at' => now(),
            ]
        );

        // Assign Role
        if (!$user->hasRole('Super Admin')) {
            $user->assignRole($role);
        }

        $this->command->info('Super Admin user created successfully.');
        $this->command->info('Email: superadmin@example.com');
        $this->command->info('Password: password');
    }
}
