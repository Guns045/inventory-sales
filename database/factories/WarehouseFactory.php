<?php

namespace Database\Factories;

<<<<<<< HEAD
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Warehouse>
 */
class WarehouseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->city() . ' Warehouse',
            'location' => $this->faker->address(),
            'code' => strtoupper($this->faker->bothify('WH-###')),
            'is_active' => true,
            'capacity' => $this->faker->numberBetween(1000, 10000),
            'manager_id' => User::factory(),
=======
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
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
        ];
    }
}
