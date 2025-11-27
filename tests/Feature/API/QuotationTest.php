<?php

namespace Tests\Feature\API;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Quotation;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class QuotationTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $customer;
    protected $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions
        Permission::create(['name' => 'quotations.read']);
        Permission::create(['name' => 'quotations.create']);
        Permission::create(['name' => 'quotations.update']);
        Permission::create(['name' => 'quotations.delete']);

        // Seed roles
        $this->seed(\Database\Seeders\RoleSeeder::class);

        // Create user with role
        $this->user = User::factory()->create();
        $this->user->assignRole('Sales'); // Assign role after seeding

        // Create customer and product
        $this->customer = Customer::factory()->create();
        $this->product = Product::factory()->create();
    }

    public function test_can_list_quotations()
    {
        Quotation::factory()->count(3)->create([
            'customer_id' => $this->customer->id,
            'created_by' => $this->user->id
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/quotations');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'quotation_number', 'customer', 'total_amount', 'status']
                ],
                'links',
                'meta'
            ]);
    }

    public function test_can_create_quotation()
    {
        $this->withoutExceptionHandling();
        $data = [
            'customer_id' => $this->customer->id,
            'warehouse_id' => \App\Models\Warehouse::factory()->create()->id,
            'valid_until' => now()->addDays(7)->format('Y-m-d'),
            'status' => 'DRAFT',
            'notes' => 'Test quotation',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                    'unit_price' => 100000,
                    'discount_percentage' => 0,
                    'tax_rate' => 11,
                ]
            ]
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/quotations', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['notes' => 'Test quotation']);

        $this->assertDatabaseHas('quotations', ['customer_id' => $this->customer->id]);
        $this->assertDatabaseHas('quotation_items', ['product_id' => $this->product->id, 'quantity' => 2]);
    }

    public function test_can_show_quotation()
    {
        $quotation = Quotation::factory()->create([
            'customer_id' => $this->customer->id,
            'created_by' => $this->user->id
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/quotations/{$quotation->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $quotation->id]);
    }

    public function test_can_update_quotation()
    {
        $quotation = Quotation::factory()->create([
            'customer_id' => $this->customer->id,
            'created_by' => $this->user->id,
            'status' => 'DRAFT'
        ]);

        $data = [
            'customer_id' => $this->customer->id,
            'warehouse_id' => \App\Models\Warehouse::factory()->create()->id,
            'valid_until' => now()->addDays(14)->format('Y-m-d'),
            'status' => 'DRAFT',
            'notes' => 'Updated notes',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 5,
                    'unit_price' => 100000,
                    'discount_percentage' => 10,
                    'tax_rate' => 11,
                ]
            ]
        ];

        $response = $this->actingAs($this->user)
            ->putJson("/api/quotations/{$quotation->id}", $data);

        $response->assertStatus(200);
        $response->assertJsonFragment(['notes' => 'Updated notes']);

        $this->assertDatabaseHas('quotation_items', ['product_id' => $this->product->id, 'quantity' => 5]);
    }

    public function test_can_delete_quotation()
    {
        $quotation = Quotation::factory()->create([
            'customer_id' => $this->customer->id,
            'created_by' => $this->user->id,
            'status' => 'DRAFT'
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/quotations/{$quotation->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('quotations', ['id' => $quotation->id]);
    }
}
