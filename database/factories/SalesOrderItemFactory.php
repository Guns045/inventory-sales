<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesOrderItemFactory extends Factory
{
    protected $model = SalesOrderItem::class;

    public function definition()
    {
        $quantity = $this->faker->numberBetween(1, 10);
        $unitPrice = $this->faker->randomFloat(2, 100, 1000);
        $discountPercentage = $this->faker->randomFloat(2, 0, 20);
        $taxRate = 11;

        $totalPrice = $quantity * $unitPrice;
        $discountAmount = $totalPrice * ($discountPercentage / 100);
        $taxAmount = ($totalPrice - $discountAmount) * ($taxRate / 100);
        $finalPrice = $totalPrice - $discountAmount + $taxAmount;

        return [
            'sales_order_id' => SalesOrder::factory(),
            'product_id' => Product::factory(),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'discount_percentage' => $discountPercentage,
            'tax_rate' => $taxRate,
            'total_price' => $finalPrice,
        ];
    }
}
