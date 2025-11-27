<?php

namespace Database\Factories;

<<<<<<< HEAD
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Category;
use App\Models\Supplier;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sku' => strtoupper($this->faker->unique()->bothify('PROD-####')),
=======
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
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'category_id' => Category::factory(),
            'supplier_id' => Supplier::factory(),
<<<<<<< HEAD
            'buy_price' => $this->faker->numberBetween(10000, 50000),
            'sell_price' => $this->faker->numberBetween(60000, 100000),
            'min_stock_level' => 10,
=======
            'buy_price' => $this->faker->randomFloat(2, 10, 1000),
            'sell_price' => $this->faker->randomFloat(2, 20, 1500),
            'min_stock_level' => $this->faker->numberBetween(5, 50),
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
        ];
    }
}
