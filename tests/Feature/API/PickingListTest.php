<?php

namespace Tests\Feature\API;

use App\Models\Customer;
use App\Models\PickingList;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PickingListTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $warehouse;
    protected $customer;
    protected $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->user = User::factory()->create();
        $this->user->assignRole('Admin');

        $this->warehouse = Warehouse::factory()->create();
        $this->customer = Customer::factory()->create();
        $this->product = Product::factory()->create();
    }

    /** @test */
    public function can_list_picking_lists()
    {
        // Create sales orders and picking lists
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'PROCESSING',
        ]);

        for ($i = 0; $i < 3; $i++) {
            PickingList::create([
                'picking_list_number' => 'PL-TEST-' . ($i + 1),
                'sales_order_id' => $salesOrder->id,
                'warehouse_id' => $this->warehouse->id,
                'user_id' => $this->user->id,
                'status' => 'READY',
            ]);
        }

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/picking-lists');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'picking_list_number',
                        'status',
                        'sales_order_id'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_picking_list_from_sales_order()
    {
        // Create a sales order with items
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'PENDING',
        ]);

        SalesOrderItem::factory()->create([
            'sales_order_id' => $salesOrder->id,
            'product_id' => $this->product->id,
            'quantity' => 10,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/picking-lists', [
            'sales_order_id' => $salesOrder->id,
            'notes' => 'Test picking list',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'picking_list_number',
                    'status',
                    'sales_order_id'
                ]
            ]);

        $this->assertDatabaseHas('picking_lists', [
            'sales_order_id' => $salesOrder->id,
            'status' => 'READY',
        ]);

        // Verify sales order status updated
        $this->assertDatabaseHas('sales_orders', [
            'id' => $salesOrder->id,
            'status' => 'PROCESSING',
        ]);
    }

    /** @test */
    public function can_show_picking_list()
    {
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $pickingList = PickingList::create([
            'picking_list_number' => 'PL-TEST-001',
            'sales_order_id' => $salesOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'status' => 'READY',
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/picking-lists/{$pickingList->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $pickingList->id]);
    }

    /** @test */
    public function can_update_picking_list()
    {
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $pickingList = PickingList::create([
            'picking_list_number' => 'PL-TEST-002',
            'sales_order_id' => $salesOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'status' => 'READY',
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->putJson("/api/picking-lists/{$pickingList->id}", [
            'notes' => 'Updated notes',
            'status' => 'PICKING',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('picking_lists', [
            'id' => $pickingList->id,
            'notes' => 'Updated notes',
        ]);
    }

    /** @test */
    public function can_delete_picking_list()
    {
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $pickingList = PickingList::create([
            'picking_list_number' => 'PL-TEST-003',
            'sales_order_id' => $salesOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'status' => 'READY',
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/picking-lists/{$pickingList->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('picking_lists', ['id' => $pickingList->id]);
    }

    /** @test */
    public function cannot_create_picking_list_for_non_pending_sales_order()
    {
        $salesOrder = SalesOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'COMPLETED',
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/picking-lists', [
            'sales_order_id' => $salesOrder->id,
        ]);

        $response->assertStatus(422);
    }
}
