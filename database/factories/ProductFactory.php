<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition()
    {
        return [
            'sku' => 'SKU-' . $this->faker->unique()->numerify('######'),
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'category_id' => Category::factory(),
            'supplier_id' => Supplier::factory(),
            'buy_price' => $this->faker->randomFloat(2, 10, 1000),
            'sell_price' => $this->faker->randomFloat(2, 20, 1500),
            'min_stock_level' => $this->faker->numberBetween(5, 50),
        ];
    }
}
