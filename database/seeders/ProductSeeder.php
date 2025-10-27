<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Category;
use App\Models\Supplier;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'sku' => 'PART-ENG-001',
                'name' => 'Filter Oli Engine',
                'description' => 'Filter oli untuk mesin heavy duty',
                'category_id' => 1,
                'supplier_id' => 1,
                'buy_price' => 250000,
                'sell_price' => 350000,
                'min_stock_level' => 10,
            ],
            [
                'sku' => 'PART-ENG-002',
                'name' => 'Oil Seal 50x65x8',
                'description' => 'Oil seal ukuran 50x65x8',
                'category_id' => 1,
                'supplier_id' => 1,
                'buy_price' => 75000,
                'sell_price' => 120000,
                'min_stock_level' => 20,
            ],
            [
                'sku' => 'PART-FIL-001',
                'name' => 'Filter Solar',
                'description' => 'Filter solar untuk alat berat',
                'category_id' => 2,
                'supplier_id' => 2,
                'buy_price' => 180000,
                'sell_price' => 275000,
                'min_stock_level' => 15,
            ],
            [
                'sku' => 'PART-HYD-001',
                'name' => 'Hydraulic Pump',
                'description' => 'Pompa hidrolik untuk excavator',
                'category_id' => 3,
                'supplier_id' => 3,
                'buy_price' => 2500000,
                'sell_price' => 3250000,
                'min_stock_level' => 5,
            ],
            [
                'sku' => 'PART-HYD-002',
                'name' => 'Hydraulic Hose 1/2"',
                'description' => 'Selang hidrolik diameter 1/2 inch',
                'category_id' => 3,
                'supplier_id' => 2,
                'buy_price' => 125000,
                'sell_price' => 185000,
                'min_stock_level' => 30,
            ],
            [
                'sku' => 'PART-TRA-001',
                'name' => 'Clutch Plate',
                'description' => 'Kopling untuk transmisi',
                'category_id' => 4,
                'supplier_id' => 1,
                'buy_price' => 850000,
                'sell_price' => 1200000,
                'min_stock_level' => 8,
            ],
            [
                'sku' => 'PART-ELE-001',
                'name' => 'Alternator 24V',
                'description' => 'Alternator 24 Volt untuk alat berat',
                'category_id' => 5,
                'supplier_id' => 3,
                'buy_price' => 1500000,
                'sell_price' => 2100000,
                'min_stock_level' => 6,
            ],
            [
                'sku' => 'PART-BRA-001',
                'name' => 'Brake Pad',
                'description' => 'Kampas rem untuk alat berat',
                'category_id' => 6,
                'supplier_id' => 2,
                'buy_price' => 320000,
                'sell_price' => 485000,
                'min_stock_level' => 12,
            ],
        ];

        foreach ($products as $product) {
            Product::create($product);
        }
    }
}