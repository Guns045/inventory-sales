<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GoodsReceiptItem>
 */
class GoodsReceiptItemFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = \App\Models\GoodsReceiptItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'goods_receipt_id' => \App\Models\GoodsReceipt::factory(),
            'purchase_order_item_id' => \App\Models\PurchaseOrderItem::factory(),
            'product_id' => \App\Models\Product::factory(),
            'quantity_ordered' => $this->faker->numberBetween(1, 100),
            'quantity_received' => $this->faker->numberBetween(1, 100),
            'unit_price' => $this->faker->randomFloat(2, 100, 10000),
            'line_total' => function (array $attributes) {
                return $attributes['quantity_received'] * $attributes['unit_price'];
            },
            'condition' => $this->faker->randomElement(['GOOD', 'DAMAGED', 'DEFECTIVE', 'WRONG_ITEM']),
            'batch_number' => $this->faker->optional(0.7)->text(20),
            'expiry_date' => $this->faker->optional(0.8)->dateTimeBetween('+1 month', '+2 years'),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }
}