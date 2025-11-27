<?php

namespace Tests\Feature\API;

use App\Models\Customer;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class SalesOrderTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $customer;
    protected $product;
    protected $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles
        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->user = User::factory()->create();
        $this->user->assignRole('Sales');

        // Clear cache to ensure permissions are loaded
        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        $this->user->refresh();

        $this->customer = Customer::factory()->create();
        $this->product = Product::factory()->create();
        $this->warehouse = Warehouse::factory()->create();
    }

    /** @test */
    public function can_list_sales_orders()
    {
        $this->withoutExceptionHandling();

        SalesOrder::factory()->count(3)->create([
            'customer_id' => $this->customer->id,
            'user_id' => $this->user->id,
            'warehouse_id' => $this->warehouse->id,
        ]);

        \Laravel\Sanctum\Sanctum::actingAs($this->user);
        $response = $this->getJson('/api/sales-orders');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'sales_order_number', 'customer', 'total_amount', 'status']
                ],
                'links',
                'meta'
            ]);
    }

    /** @test */
    public function can_create_sales_order()
    {
        $this->withoutExceptionHandling();
        $data = [
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'PENDING',
            'notes' => 'Test sales order',
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
            ->postJson('/api/sales-orders', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['notes' => 'Test sales order']);

        $this->assertDatabaseHas('sales_orders', ['customer_id' => $this->customer->id]);
        $this->assertDatabaseHas('sales_order_items', ['product_id' => $this->product->id, 'quantity' => 2]);
    }

    /** @test */
    public function can_show_sales_order()
    {
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'user_id' => $this->user->id,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/sales-orders/{$salesOrder->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $salesOrder->id]);
    }

    /** @test */
    public function can_update_sales_order()
    {
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'user_id' => $this->user->id,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'PENDING',
        ]);

        $data = [
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'PROCESSING',
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
            ->putJson("/api/sales-orders/{$salesOrder->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['notes' => 'Updated notes']);

        $this->assertDatabaseHas('sales_order_items', ['product_id' => $this->product->id, 'quantity' => 5]);
    }

    /** @test */
    public function can_delete_sales_order()
    {
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'user_id' => $this->user->id,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/sales-orders/{$salesOrder->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('sales_orders', ['id' => $salesOrder->id]);
    }
}
