<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Admin', 'description' => 'Administrator with full access'],
            ['name' => 'Sales', 'description' => 'Sales staff'],
            ['name' => 'Gudang', 'description' => 'Warehouse staff'],
            ['name' => 'Finance', 'description' => 'Finance staff'],
        ];

        foreach ($roles as $role) {
            Role::create($role);
        }
    }
}