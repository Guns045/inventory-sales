<?php

namespace Tests\Feature\API;

use App\Models\GoodsReceipt;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GoodsReceiptTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $warehouse;
    protected $supplier;
    protected $product;
    protected $purchaseOrder;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->user = User::factory()->create();
        $this->user->assignRole('Super Admin');

        // Clear permission cache and refresh user
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $this->user = $this->user->fresh();

        $this->warehouse = Warehouse::factory()->create();
        $this->supplier = Supplier::factory()->create();
        $this->product = Product::factory()->create();

        // Create a purchase order with items
        $this->purchaseOrder = PurchaseOrder::create([
            'po_number' => 'PO-TEST-001',
            'supplier_id' => $this->supplier->id,
            'user_id' => $this->user->id,
            'status' => 'DRAFT',
            'order_date' => now(),
            'expected_delivery_date' => now()->addDays(7),
            'total_amount' => 1000.00,
        ]);

        PurchaseOrderItem::create([
            'purchase_order_id' => $this->purchaseOrder->id,
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity_ordered' => 100,
            'quantity_received' => 0,
            'unit_price' => 10.00,
            'line_total' => 1000.00,
        ]);
    }

    /** @test */
    public function can_list_goods_receipts()
    {
        GoodsReceipt::create([
            'receipt_number' => 'GR-TEST-001',
            'purchase_order_id' => $this->purchaseOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'received_by' => $this->user->id,
            'status' => 'PENDING',
            'receipt_date' => now(),
            'total_amount' => 1000.00,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/goods-receipts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'receipt_number',
                        'status',
                        'purchase_order_id'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_goods_receipt()
    {
        $poItem = $this->purchaseOrder->items->first();

        Sanctum::actingAs($this->user);

        $data = [
            'purchase_order_id' => $this->purchaseOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'received_date' => now()->format('Y-m-d'),
            'notes' => 'Test goods receipt',
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'product_id' => $poItem->product_id,
                    'quantity_ordered' => $poItem->quantity_ordered,
                    'quantity_received' => 50,
                    'unit_price' => $poItem->unit_price,
                    'condition' => 'GOOD',
                ]
            ]
        ];

        $response = $this->postJson('/api/goods-receipts', $data);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'receipt_number',
                    'status'
                ]
            ]);

        $this->assertDatabaseHas('goods_receipts', [
            'purchase_order_id' => $this->purchaseOrder->id,
            'status' => 'PENDING',
        ]);
    }

    /** @test */
    public function can_show_goods_receipt()
    {
        $goodsReceipt = GoodsReceipt::create([
            'receipt_number' => 'GR-TEST-002',
            'purchase_order_id' => $this->purchaseOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'received_by' => $this->user->id,
            'status' => 'PENDING',
            'receipt_date' => now(),
            'total_amount' => 500.00,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/goods-receipts/{$goodsReceipt->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $goodsReceipt->id]);
    }

    /** @test */
    public function can_update_pending_goods_receipt()
    {
        $goodsReceipt = GoodsReceipt::create([
            'receipt_number' => 'GR-TEST-003',
            'purchase_order_id' => $this->purchaseOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'received_by' => $this->user->id,
            'status' => 'PENDING',
            'receipt_date' => now(),
            'total_amount' => 500.00,
        ]);

        $poItem = $this->purchaseOrder->items->first();

        Sanctum::actingAs($this->user);

        $data = [
            'received_date' => now()->addDay()->format('Y-m-d'),
            'notes' => 'Updated notes',
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'product_id' => $poItem->product_id,
                    'quantity_ordered' => $poItem->quantity_ordered,
                    'quantity_received' => 75,
                    'unit_price' => $poItem->unit_price,
                    'condition' => 'GOOD',
                ]
            ]
        ];

        $response = $this->putJson("/api/goods-receipts/{$goodsReceipt->id}", $data);

        $response->assertStatus(200);

        $this->assertDatabaseHas('goods_receipts', [
            'id' => $goodsReceipt->id,
            'notes' => 'Updated notes',
        ]);
    }

    /** @test */
    public function can_delete_pending_goods_receipt()
    {
        $goodsReceipt = GoodsReceipt::create([
            'receipt_number' => 'GR-TEST-004',
            'purchase_order_id' => $this->purchaseOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'received_by' => $this->user->id,
            'status' => 'PENDING',
            'receipt_date' => now(),
            'total_amount' => 500.00,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/goods-receipts/{$goodsReceipt->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('goods_receipts', ['id' => $goodsReceipt->id]);
    }

    /** @test */
    public function cannot_update_received_goods_receipt()
    {
        $goodsReceipt = GoodsReceipt::create([
            'receipt_number' => 'GR-TEST-005',
            'purchase_order_id' => $this->purchaseOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'user_id' => $this->user->id,
            'received_by' => $this->user->id,
            'status' => 'RECEIVED',
            'receipt_date' => now(),
            'total_amount' => 500.00,
        ]);

        $poItem = $this->purchaseOrder->items->first();

        Sanctum::actingAs($this->user);

        $data = [
            'received_date' => now()->format('Y-m-d'),
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'product_id' => $poItem->product_id,
                    'quantity_ordered' => $poItem->quantity_ordered,
                    'quantity_received' => 50,
                    'unit_price' => $poItem->unit_price,
                    'condition' => 'GOOD',
                ]
            ]
        ];

        $response = $this->putJson("/api/goods-receipts/{$goodsReceipt->id}", $data);

        $response->assertStatus(422);
    }
}
