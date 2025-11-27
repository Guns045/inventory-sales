<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\SalesOrder;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesOrderFactory extends Factory
{
    protected $model = SalesOrder::class;

    public function definition()
    {
        return [
            'sales_order_number' => 'SO-' . $this->faker->unique()->numberBetween(1000, 9999),
            'customer_id' => Customer::factory(),
            'user_id' => User::factory(),
            'warehouse_id' => Warehouse::factory(),
            'status' => 'PENDING',
            'total_amount' => $this->faker->randomFloat(2, 1000, 100000),
            'notes' => $this->faker->sentence,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
