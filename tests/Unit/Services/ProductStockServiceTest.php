<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\ProductStockService;
use App\Models\ProductStock;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

class ProductStockServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $productStockService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->productStockService = new ProductStockService();
    }

    /** @test */
    public function it_can_get_stock_levels_per_warehouse_view()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse1 = Warehouse::factory()->create();
        $warehouse2 = Warehouse::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse1->id,
            'quantity' => 100,
            'reserved_quantity' => 20
        ]);

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
            'reserved_quantity' => 10
        ]);

        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        // Act
        $result = $this->productStockService->getStockLevels([
            'view_mode' => 'per-warehouse',
            'per_page' => 10
        ], $user);

        // Assert
        $this->assertEquals(2, $result->total());
        $this->assertEquals(80, $result->first()->available_quantity);
    }

    /** @test */
    public function it_can_get_stock_levels_consolidated_view()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse1 = Warehouse::factory()->create();
        $warehouse2 = Warehouse::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse1->id,
            'quantity' => 100,
            'reserved_quantity' => 20
        ]);

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
            'reserved_quantity' => 10
        ]);

        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        // Act
        $result = $this->productStockService->getStockLevels([
            'view_mode' => 'consolidated',
            'per_page' => 10
        ], $user);

        // Assert
        $this->assertEquals(1, $result->total());
        $firstItem = $result->first();
        $this->assertEquals(150, $firstItem['quantity']);
        $this->assertEquals(30, $firstItem['reserved_quantity']);
    }

    /** @test */
    public function it_filters_stock_by_warehouse_for_non_admin_users()
    {
        // Arrange
        $warehouse1 = Warehouse::factory()->create();
        $warehouse2 = Warehouse::factory()->create();
        $product = Product::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse1->id,
            'quantity' => 100,
        ]);

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 50,
        ]);

        $user = User::factory()->create(['warehouse_id' => $warehouse1->id]);
        $user->assignRole('Gudang');

        // Act
        $result = $this->productStockService->getStockLevels([
            'view_mode' => 'per-warehouse',
            'per_page' => 10
        ], $user);

        // Assert
        $this->assertEquals(1, $result->total());
        $this->assertEquals($warehouse1->id, $result->first()->warehouse_id);
    }

    /** @test */
    public function it_can_create_product_stock()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();

        $data = [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ];

        // Act
        $stock = $this->productStockService->createStock($data);

        // Assert
        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
        ]);
    }

    /** @test */
    public function it_prevents_duplicate_product_stock_creation()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
        ]);

        $data = [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ];

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Product stock record already exists');

        $this->productStockService->createStock($data);
    }

    /** @test */
    public function it_can_update_product_stock()
    {
        // Arrange
        $stock = ProductStock::factory()->create(['quantity' => 100]);

        $updateData = [
            'product_id' => $stock->product_id,
            'warehouse_id' => $stock->warehouse_id,
            'quantity' => 200,
            'reserved_quantity' => 50,
        ];

        // Act
        $updated = $this->productStockService->updateStock($stock, $updateData);

        // Assert
        $this->assertEquals(200, $updated->quantity);
        $this->assertEquals(50, $updated->reserved_quantity);
    }

    /** @test */
    public function it_can_adjust_stock_increase()
    {
        // Arrange
        $stock = ProductStock::factory()->create([
            'quantity' => 100,
            'reserved_quantity' => 0
        ]);

        $user = User::factory()->create();
        Auth::login($user);

        $data = [
            'product_stock_id' => $stock->id,
            'adjustment_type' => 'increase',
            'quantity' => 50,
            'reason' => 'Stock replenishment',
            'notes' => 'Test notes'
        ];

        // Act
        $result = $this->productStockService->adjustStock($data);

        // Assert
        $this->assertTrue($result['success']);
        $this->assertEquals(150, $result['new_quantity']);
        $this->assertDatabaseHas('product_stock', [
            'id' => $stock->id,
            'quantity' => 150
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $stock->product_id,
            'type' => 'ADJUSTMENT_IN',
            'quantity_change' => 50
        ]);
    }

    /** @test */
    public function it_can_adjust_stock_decrease()
    {
        // Arrange
        $stock = ProductStock::factory()->create([
            'quantity' => 100,
            'reserved_quantity' => 0
        ]);

        $user = User::factory()->create();
        Auth::login($user);

        $data = [
            'product_stock_id' => $stock->id,
            'adjustment_type' => 'decrease',
            'quantity' => 30,
            'reason' => 'Damaged goods',
            'notes' => 'Test notes'
        ];

        // Act
        $result = $this->productStockService->adjustStock($data);

        // Assert
        $this->assertTrue($result['success']);
        $this->assertEquals(70, $result['new_quantity']);
        $this->assertDatabaseHas('product_stock', [
            'id' => $stock->id,
            'quantity' => 70
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $stock->product_id,
            'type' => 'ADJUSTMENT_OUT',
            'quantity_change' => -30
        ]);
    }

    /** @test */
    public function it_prevents_stock_decrease_below_zero()
    {
        // Arrange
        $stock = ProductStock::factory()->create(['quantity' => 10]);

        $user = User::factory()->create();
        Auth::login($user);

        $data = [
            'product_stock_id' => $stock->id,
            'adjustment_type' => 'decrease',
            'quantity' => 20,
            'reason' => 'Test',
        ];

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Insufficient stock for adjustment');

        $this->productStockService->adjustStock($data);
    }

    /** @test */
    public function it_can_get_movement_history()
    {
        // Arrange
        $stock = ProductStock::factory()->create();
        $user = User::factory()->create();

        StockMovement::factory()->count(5)->create([
            'product_id' => $stock->product_id,
            'warehouse_id' => $stock->warehouse_id,
            'created_by' => $user->id
        ]);

        // Act
        $result = $this->productStockService->getMovementHistory($stock->id);

        // Assert
        $this->assertEquals(5, $result->total());
    }

    /** @test */
    public function it_can_search_stock_by_product_name()
    {
        // Arrange
        $product1 = Product::factory()->create(['name' => 'Alpha Product']);
        $product2 = Product::factory()->create(['name' => 'Beta Product']);
        $warehouse = Warehouse::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product1->id,
            'warehouse_id' => $warehouse->id
        ]);

        ProductStock::factory()->create([
            'product_id' => $product2->id,
            'warehouse_id' => $warehouse->id
        ]);

        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        // Act
        $result = $this->productStockService->getStockLevels([
            'search' => 'Alpha',
            'per_page' => 10
        ], $user);

        // Assert
        $this->assertEquals(1, $result->total());
    }
}
