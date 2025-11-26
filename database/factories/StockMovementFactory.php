<?php

namespace Database\Factories;

use App\Models\StockMovement;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockMovementFactory extends Factory
{
    protected $model = StockMovement::class;

    public function definition()
    {
        $types = ['IN', 'OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RESERVATION'];

        return [
            'product_id' => Product::factory(),
            'warehouse_id' => Warehouse::factory(),
            'type' => $this->faker->randomElement($types),
            'quantity_change' => $this->faker->numberBetween(-100, 100),
            'previous_quantity' => $this->faker->numberBetween(0, 1000),
            'new_quantity' => $this->faker->numberBetween(0, 1000),
            'movement_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'reference_type' => null,
            'reference_id' => null,
            'reference_number' => null,
            'created_by' => User::factory(),
            'notes' => $this->faker->sentence(),
        ];
    }
}
