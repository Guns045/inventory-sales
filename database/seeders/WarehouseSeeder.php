<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Warehouse;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $warehouses = [
            [
                'name' => 'Gudang Utama',
                'location' => 'Jl. Gudang No. 1, Jakarta Pusat',
            ],
            [
                'name' => 'Gudang Cabang Bekasi',
                'location' => 'Jl. Industri No. 25, Bekasi',
            ],
        ];

        foreach ($warehouses as $warehouse) {
            Warehouse::create($warehouse);
        }
    }
}