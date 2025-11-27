<?php

namespace Database\Factories;

<<<<<<< HEAD
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
=======
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
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
            'customer_id' => Customer::factory(),
            'user_id' => User::factory(),
            'warehouse_id' => Warehouse::factory(),
            'status' => 'DRAFT',
<<<<<<< HEAD
            'valid_until' => $this->faker->dateTimeBetween('+1 week', '+1 month'),
            'subtotal' => 0,
            'discount' => 0,
            'tax' => 0,
            'total_amount' => 0,
            'notes' => $this->faker->sentence(),
=======
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
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
        ];
    }
}
