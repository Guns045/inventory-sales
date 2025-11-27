<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Quotation;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class QuotationFactory extends Factory
{
    protected $model = Quotation::class;

    public function definition(): array
    {
        return [
            'quotation_number' => $this->faker->unique()->bothify('QT-####'),
            'customer_id' => Customer::factory(),
            'user_id' => User::factory(),
            'warehouse_id' => Warehouse::factory(),
            'status' => 'DRAFT',
            'valid_until' => now()->addDays(30),
            'subtotal' => 1000,
            'discount' => 0,
            'tax' => 110,
            'total_amount' => 1110,
            'tax_rate' => 11,
            'other_costs' => 0,
            'payment_term' => 'Net 30',
            'terms' => $this->faker->sentence,
            'notes' => $this->faker->sentence,
        ];
    }
}
