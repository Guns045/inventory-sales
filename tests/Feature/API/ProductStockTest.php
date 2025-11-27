<?php

namespace Tests\Feature\API;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductStockTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $warehouse;
    protected $product;
    protected $productStock;

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
        $this->product = Product::factory()->create();

        $this->productStock = ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 10,
        ]);
    }

    /** @test */
    public function can_list_product_stocks()
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/product-stock');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'product_id',
                        'warehouse_id',
                        'quantity',
                        'reserved_quantity'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_list_product_stocks_with_search()
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/product-stock?search=' . $this->product->name);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function can_filter_product_stocks_by_warehouse()
    {
        $warehouse2 = Warehouse::factory()->create();
        ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
            'reserved_quantity' => 5,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/product-stock?warehouse_id=' . $this->warehouse->id);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function can_view_consolidated_stock()
    {
        // Create stock in another warehouse for same product
        $warehouse2 = Warehouse::factory()->create();
        ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
            'reserved_quantity' => 5,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/product-stock?view_mode=consolidated');

        $response->assertStatus(200)
            ->assertJsonFragment(['view_mode' => 'consolidated']);
    }

    /** @test */
    public function can_create_product_stock()
    {
        $product2 = Product::factory()->create();

        Sanctum::actingAs($this->user);

        $data = [
            'product_id' => $product2->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 200,
            'reserved_quantity' => 0,
        ];

        $response = $this->postJson('/api/product-stock', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['quantity' => 200]);

        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product2->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 200,
        ]);
    }

    /** @test */
    public function cannot_create_duplicate_product_stock()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 50,
            'reserved_quantity' => 0,
        ];

        $response = $this->postJson('/api/product-stock', $data);

        $response->assertStatus(422)
            ->assertJsonFragment(['error' => 'Product stock record already exists for this product and warehouse']);
    }

    /** @test */
    public function validates_required_fields_on_create()
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/product-stock', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_id', 'warehouse_id', 'quantity', 'reserved_quantity']);
    }

    /** @test */
    public function can_show_product_stock()
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/product-stock/{$this->productStock->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $this->productStock->id,
                'quantity' => 100
            ]);
    }

    /** @test */
    public function can_update_product_stock()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 150,
            'reserved_quantity' => 20,
        ];

        $response = $this->putJson("/api/product-stock/{$this->productStock->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['quantity' => 150]);

        $this->assertDatabaseHas('product_stock', [
            'id' => $this->productStock->id,
            'quantity' => 150,
            'reserved_quantity' => 20,
        ]);
    }

    /** @test */
    public function cannot_update_to_duplicate_product_warehouse_combination()
    {
        $warehouse2 = Warehouse::factory()->create();
        $productStock2 = ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
            'reserved_quantity' => 5,
        ]);

        Sanctum::actingAs($this->user);

        // Try to update productStock2 to use same product+warehouse as productStock
        $data = [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 10,
        ];

        $response = $this->putJson("/api/product-stock/{$productStock2->id}", $data);

        $response->assertStatus(422)
            ->assertJsonFragment(['error' => 'Product stock record already exists for this product and warehouse']);
    }

    /** @test */
    public function can_delete_product_stock()
    {
        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/product-stock/{$this->productStock->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Product stock deleted successfully']);

        $this->assertDatabaseMissing('product_stock', ['id' => $this->productStock->id]);
    }

    /** @test */
    public function can_adjust_stock_increase()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'product_stock_id' => $this->productStock->id,
            'adjustment_type' => 'increase',
            'quantity' => 50,
            'reason' => 'Stock replenishment',
            'notes' => 'Received from supplier'
        ];

        $response = $this->postJson('/api/product-stock/adjust', $data);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'success' => true,
                'new_quantity' => 150,
                'adjustment_type' => 'increase',
                'quantity_changed' => 50
            ]);

        $this->assertDatabaseHas('product_stock', [
            'id' => $this->productStock->id,
            'quantity' => 150,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'type' => 'ADJUSTMENT',
            'quantity_change' => 50,
            'reason' => 'Stock replenishment',
        ]);
    }

    /** @test */
    public function can_adjust_stock_decrease()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'product_stock_id' => $this->productStock->id,
            'adjustment_type' => 'decrease',
            'quantity' => 30,
            'reason' => 'Damaged goods',
            'notes' => 'Items damaged during handling'
        ];

        $response = $this->postJson('/api/product-stock/adjust', $data);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'success' => true,
                'new_quantity' => 70,
                'adjustment_type' => 'decrease',
                'quantity_changed' => 30
            ]);

        $this->assertDatabaseHas('product_stock', [
            'id' => $this->productStock->id,
            'quantity' => 70,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'type' => 'ADJUSTMENT',
            'quantity_change' => -30,
            'reason' => 'Damaged goods',
        ]);
    }

    /** @test */
    public function cannot_decrease_stock_below_zero()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'product_stock_id' => $this->productStock->id,
            'adjustment_type' => 'decrease',
            'quantity' => 150, // More than available (100)
            'reason' => 'Test adjustment',
        ];

        $response = $this->postJson('/api/product-stock/adjust', $data);

        $response->assertStatus(500); // Exception thrown in transaction

        // Stock should remain unchanged
        $this->assertDatabaseHas('product_stock', [
            'id' => $this->productStock->id,
            'quantity' => 100,
        ]);
    }

    /** @test */
    public function validates_stock_adjustment_fields()
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/product-stock/adjust', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_stock_id', 'adjustment_type', 'quantity', 'reason']);
    }

    /** @test */
    public function can_get_movement_history()
    {
        // Create some stock movements
        StockMovement::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'type' => 'ADJUSTMENT',
            'quantity_change' => 50,
            'reference_type' => 'App\Models\ProductStock',
            'reference_id' => $this->productStock->id,
            'reason' => 'Initial stock',
            'user_id' => $this->user->id,
            'previous_quantity' => 0,
            'new_quantity' => 50,
        ]);

        StockMovement::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'type' => 'ADJUSTMENT',
            'quantity_change' => -10,
            'reference_type' => 'App\Models\ProductStock',
            'reference_id' => $this->productStock->id,
            'reason' => 'Damaged',
            'user_id' => $this->user->id,
            'previous_quantity' => 50,
            'new_quantity' => 40,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/product-stock/{$this->productStock->id}/movements");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'product_id',
                        'warehouse_id',
                        'type',
                        'quantity_change',
                        'reason'
                    ]
                ]
            ])
            ->assertJsonCount(2, 'data');
    }

    /** @test */
    public function warehouse_role_can_only_see_their_warehouse_stock()
    {
        // Create warehouse user
        $manager = User::factory()->create(['warehouse_id' => $this->warehouse->id]);
        $manager->assignRole('Warehouse');
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $manager = $manager->fresh();

        // Create stock in another warehouse
        $warehouse2 = Warehouse::factory()->create();
        ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
            'reserved_quantity' => 5,
        ]);

        Sanctum::actingAs($manager);

        $response = $this->getJson('/api/product-stock');

        $response->assertStatus(200);

        // Should only see stock from their warehouse
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->warehouse->id, $data[0]['warehouse_id']);
    }

    /** @test */
    public function sales_role_can_see_all_warehouse_stock()
    {
        // Create sales user
        $salesUser = User::factory()->create();
        $salesUser->assignRole('Sales');
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $salesUser = $salesUser->fresh();

        // Create stock in multiple warehouses
        $warehouse2 = Warehouse::factory()->create();
        ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
            'reserved_quantity' => 5,
        ]);

        Sanctum::actingAs($salesUser);

        $response = $this->getJson('/api/product-stock');

        $response->assertStatus(200);

        // Should see stock from all warehouses
        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(2, count($data));
    }
}
