<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class RootUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = 'root@jinantruck.my.id';

        // Check if user exists
        $user = User::where('email', $email)->first();

        if (!$user) {
            $user = User::create([
                'name' => 'System Root',
                'email' => $email,
                'password' => Hash::make('muhammad09'),
                'is_active' => 1,
                'email_verified_at' => now(),
            ]);

            $this->command->info('Root user created successfully.');
        } else {
            $user->update([
                'password' => Hash::make('muhammad09'),
                'is_active' => 1,
            ]);
            $this->command->info('Root user updated successfully.');
        }

        // Assign Super Admin role
        $role = Role::where('name', 'Super Admin')->first();
        if ($role) {
            $user->assignRole($role);
            $this->command->info('Super Admin role assigned to root user.');
        } else {
            $this->command->error('Super Admin role not found!');
        }
    }
}
