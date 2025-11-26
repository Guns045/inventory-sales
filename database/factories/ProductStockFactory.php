<?php

namespace Database\Factories;

use App\Models\ProductStock;
use App\Models\Product;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductStockFactory extends Factory
{
    protected $model = ProductStock::class;

    public function definition()
    {
        return [
            'product_id' => Product::factory(),
            'warehouse_id' => Warehouse::factory(),
            'quantity' => $this->faker->numberBetween(0, 1000),
            'reserved_quantity' => $this->faker->numberBetween(0, 100),
        ];
    }
}
