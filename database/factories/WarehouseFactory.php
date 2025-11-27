<?php

namespace Database\Factories;

use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class WarehouseFactory extends Factory
{
    protected $model = Warehouse::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->city . ' Warehouse',
            'location' => $this->faker->address,
            'code' => strtoupper($this->faker->unique()->bothify('WH-###')),
            'is_active' => true,
            'capacity' => $this->faker->numberBetween(1000, 10000),
        ];
    }
}
