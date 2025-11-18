<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GoodsReceipt>
 */
class GoodsReceiptFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = \App\Models\GoodsReceipt::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'receipt_number' => 'GR-' . date('Y') . '-' . str_pad($this->faker->unique()->numberBetween(1, 9999), 4, '0', STR_PAD_LEFT),
            'purchase_order_id' => \App\Models\PurchaseOrder::factory(),
            'warehouse_id' => \App\Models\Warehouse::factory(),
            'received_by' => \App\Models\User::factory(),
            'status' => $this->faker->randomElement(['PENDING', 'RECEIVED', 'REJECTED']),
            'received_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'notes' => $this->faker->sentence(),
            'total_amount' => $this->faker->randomFloat(2, 1000, 100000),
        ];
    }
}