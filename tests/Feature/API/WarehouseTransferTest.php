<?php

namespace Tests\Feature\API;

use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseTransfer;
use App\Models\ProductStock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WarehouseTransferTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $warehouseFrom;
    protected $warehouseTo;
    protected $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->user = User::factory()->create();
        $this->user->assignRole('Admin');

        // Clear permission cache and refresh user
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $this->user = $this->user->fresh();

        $this->warehouseFrom = Warehouse::factory()->create(['name' => 'Warehouse A']);
        $this->warehouseTo = Warehouse::factory()->create(['name' => 'Warehouse B']);
        $this->product = Product::factory()->create();

        // Create stock in source warehouse
        ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouseFrom->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);
    }

    /** @test */
    public function can_list_warehouse_transfers()
    {
        WarehouseTransfer::create([
            'transfer_number' => 'WT-TEST-001',
            'product_id' => $this->product->id,
            'warehouse_from_id' => $this->warehouseFrom->id,
            'warehouse_to_id' => $this->warehouseTo->id,
            'quantity_requested' => 10,
            'status' => 'REQUESTED',
            'requested_by' => $this->user->id,
            'requested_at' => now(),
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/warehouse-transfers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'transfer_number',
                        'status'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_warehouse_transfer()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'product_id' => $this->product->id,
            'warehouse_from_id' => $this->warehouseFrom->id,
            'warehouse_to_id' => $this->warehouseTo->id,
            'quantity_requested' => 20,
            'notes' => 'Test transfer',
        ];

        $response = $this->postJson('/api/warehouse-transfers', $data);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'transfer_number',
                    'status'
                ]
            ]);

        $this->assertDatabaseHas('warehouse_transfers', [
            'product_id' => $this->product->id,
            'status' => 'REQUESTED',
        ]);
    }

    /** @test */
    public function can_show_warehouse_transfer()
    {
        $transfer = WarehouseTransfer::create([
            'transfer_number' => 'WT-TEST-002',
            'product_id' => $this->product->id,
            'warehouse_from_id' => $this->warehouseFrom->id,
            'warehouse_to_id' => $this->warehouseTo->id,
            'quantity_requested' => 15,
            'status' => 'REQUESTED',
            'requested_by' => $this->user->id,
            'requested_at' => now(),
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/warehouse-transfers/{$transfer->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $transfer->id]);
    }

    /** @test */
    public function can_approve_warehouse_transfer()
    {
        $transfer = WarehouseTransfer::create([
            'transfer_number' => 'WT-TEST-003',
            'product_id' => $this->product->id,
            'warehouse_from_id' => $this->warehouseFrom->id,
            'warehouse_to_id' => $this->warehouseTo->id,
            'quantity_requested' => 25,
            'status' => 'REQUESTED',
            'requested_by' => $this->user->id,
            'requested_at' => now(),
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->postJson("/api/warehouse-transfers/{$transfer->id}/approve");

        $response->assertStatus(200);

        $this->assertDatabaseHas('warehouse_transfers', [
            'id' => $transfer->id,
            'status' => 'APPROVED',
        ]);
    }

    /** @test */
    public function can_deliver_warehouse_transfer()
    {
        $transfer = WarehouseTransfer::create([
            'transfer_number' => 'WT-TEST-004',
            'product_id' => $this->product->id,
            'warehouse_from_id' => $this->warehouseFrom->id,
            'warehouse_to_id' => $this->warehouseTo->id,
            'quantity_requested' => 30,
            'status' => 'APPROVED',
            'requested_by' => $this->user->id,
            'requested_at' => now(),
            'approved_by' => $this->user->id,
            'approved_at' => now(),
        ]);

        Sanctum::actingAs($this->user);

        $data = [
            'quantity_delivered' => 30,
        ];

        $response = $this->postJson("/api/warehouse-transfers/{$transfer->id}/deliver", $data);

        $response->assertStatus(200);

        $this->assertDatabaseHas('warehouse_transfers', [
            'id' => $transfer->id,
            'status' => 'IN_TRANSIT',
        ]);
    }

    /** @test */
    public function can_receive_warehouse_transfer()
    {
        $transfer = WarehouseTransfer::create([
            'transfer_number' => 'WT-TEST-005',
            'product_id' => $this->product->id,
            'warehouse_from_id' => $this->warehouseFrom->id,
            'warehouse_to_id' => $this->warehouseTo->id,
            'quantity_requested' => 35,
            'quantity_delivered' => 35,
            'status' => 'IN_TRANSIT',
            'requested_by' => $this->user->id,
            'requested_at' => now(),
            'approved_by' => $this->user->id,
            'approved_at' => now(),
            'delivered_by' => $this->user->id,
            'delivered_at' => now(),
        ]);

        Sanctum::actingAs($this->user);

        $data = [
            'quantity_received' => 35,
        ];

        $response = $this->postJson("/api/warehouse-transfers/{$transfer->id}/receive", $data);

        $response->assertStatus(200);

        $this->assertDatabaseHas('warehouse_transfers', [
            'id' => $transfer->id,
            'status' => 'COMPLETED',
        ]);
    }
}
