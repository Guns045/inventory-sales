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
                'code' => 'JKT-01',
                'is_active' => true,
                'capacity' => 1000,
            ],
            [
                'name' => 'Gudang Cabang Bekasi',
                'location' => 'Jl. Industri No. 25, Bekasi',
                'code' => 'BKS-01',
                'is_active' => true,
                'capacity' => 500,
            ],
            [
                'name' => 'Gudang Makassar',
                'location' => 'Jl. Poros Makassar No. 10, Sulawesi Selatan',
                'code' => 'MKS-01',
                'is_active' => true,
                'capacity' => 750,
            ],
        ];

        foreach ($warehouses as $warehouse) {
            Warehouse::create($warehouse);
        }
    }
}