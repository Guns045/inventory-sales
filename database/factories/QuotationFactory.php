<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Customer;
use App\Models\User;
use App\Models\Warehouse;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Quotation>
 */
class QuotationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'quotation_number' => strtoupper($this->faker->unique()->bothify('QT-####')),
            'customer_id' => Customer::factory(),
            'user_id' => User::factory(),
            'warehouse_id' => Warehouse::factory(),
            'status' => 'DRAFT',
            'valid_until' => $this->faker->dateTimeBetween('+1 week', '+1 month'),
            'subtotal' => 0,
            'discount' => 0,
            'tax' => 0,
            'total_amount' => 0,
            'notes' => $this->faker->sentence(),
        ];
    }
}
