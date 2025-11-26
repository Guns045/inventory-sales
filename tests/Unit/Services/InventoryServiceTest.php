<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\InventoryService;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Warehouse;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\StockMovement;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->inventoryService = new InventoryService();
    }

    /** @test */
    public function it_can_reserve_stock_for_quotation()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();
        $quotation = Quotation::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 0
        ]);

        // Act
        $reservations = $this->inventoryService->reserveStock($product->id, 30, $quotation);

        // Assert
        $this->assertCount(1, $reservations);
        $this->assertEquals(30, $reservations[0]['quantity_reserved']);
        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'reserved_quantity' => 30
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'type' => 'RESERVATION',
            'quantity_change' => -30
        ]);
    }

    /** @test */
    public function it_reserves_stock_across_multiple_warehouses()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse1 = Warehouse::factory()->create();
        $warehouse2 = Warehouse::factory()->create();
        $quotation = Quotation::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse1->id,
            'quantity' => 50,
            'reserved_quantity' => 0
        ]);

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse2->id,
            'quantity' => 80,
            'reserved_quantity' => 0
        ]);

        // Act
        $reservations = $this->inventoryService->reserveStock($product->id, 100, $quotation);

        // Assert
        $this->assertCount(2, $reservations);
        $totalReserved = array_sum(array_column($reservations, 'quantity_reserved'));
        $this->assertEquals(100, $totalReserved);
    }

    /** @test */
    public function it_throws_exception_when_insufficient_stock_for_reservation()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();
        $quotation = Quotation::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 10,
            'reserved_quantity' => 0
        ]);

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Insufficient stock');

        $this->inventoryService->reserveStock($product->id, 20, $quotation);
    }

    /** @test */
    public function it_can_check_stock_availability()
    {
        // Arrange
        $product1 = Product::factory()->create();
        $product2 = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product1->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 20
        ]);

        ProductStock::factory()->create([
            'product_id' => $product2->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 50,
            'reserved_quantity' => 10
        ]);

        $items = collect([
            (object) ['product_id' => $product1->id, 'quantity' => 50],
            (object) ['product_id' => $product2->id, 'quantity' => 30],
        ]);

        // Act
        $result = $this->inventoryService->checkStockAvailability($items);

        // Assert
        $this->assertTrue($result);
    }

    /** @test */
    public function it_returns_false_when_stock_unavailable()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 10,
            'reserved_quantity' => 5
        ]);

        $items = collect([
            (object) ['product_id' => $product->id, 'quantity' => 10],
        ]);

        // Act
        $result = $this->inventoryService->checkStockAvailability($items);

        // Assert
        $this->assertFalse($result);
    }

    /** @test */
    public function it_can_get_stock_details_for_product()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse1 = Warehouse::factory()->create(['name' => 'Warehouse A']);
        $warehouse2 = Warehouse::factory()->create(['name' => 'Warehouse B']);

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

        // Act
        $details = $this->inventoryService->getStockDetails($product->id);

        // Assert
        $this->assertEquals(120, $details['total_available']);
        $this->assertCount(2, $details['warehouse_stocks']);
        $this->assertEquals('Warehouse A', $details['warehouse_stocks'][0]['warehouse_name']);
    }

    /** @test */
    public function it_can_deduct_stock_for_shipped_sales_order()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();
        $user = User::factory()->create();

        $salesOrder = SalesOrder::factory()->create([
            'status' => 'SHIPPED',
            'warehouse_id' => $warehouse->id
        ]);

        $item = SalesOrderItem::factory()->create([
            'sales_order_id' => $salesOrder->id,
            'product_id' => $product->id,
            'quantity' => 30
        ]);

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 30
        ]);

        // Act
        $movements = $this->inventoryService->deductStockForSalesOrder($salesOrder, $user->id);

        // Assert
        $this->assertCount(1, $movements);
        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'quantity' => 70,
            'reserved_quantity' => 0
        ]);
        $this->assertDatabaseHas('sales_orders', [
            'id' => $salesOrder->id,
            'status' => 'COMPLETED'
        ]);
    }

    /** @test */
    public function it_throws_exception_when_deducting_non_shipped_order()
    {
        // Arrange
        $salesOrder = SalesOrder::factory()->create(['status' => 'PENDING']);
        $user = User::factory()->create();

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Sales Order must be in SHIPPED status');

        $this->inventoryService->deductStockForSalesOrder($salesOrder, $user->id);
    }

    /** @test */
    public function it_can_reserve_stock_for_pending_sales_order()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = Warehouse::factory()->create();
        $user = User::factory()->create();

        $salesOrder = SalesOrder::factory()->create([
            'status' => 'PENDING',
            'warehouse_id' => $warehouse->id
        ]);

        $item = SalesOrderItem::factory()->create([
            'sales_order_id' => $salesOrder->id,
            'product_id' => $product->id,
            'quantity' => 25
        ]);

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 0
        ]);

        // Act
        $this->inventoryService->reserveStockForSalesOrder($salesOrder, $user->id);

        // Assert
        $this->assertDatabaseHas('product_stock', [
            'product_id' => $product->id,
            'reserved_quantity' => 25
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'type' => 'RESERVATION',
            'reference_type' => 'SalesOrder',
            'reference_id' => $salesOrder->id
        ]);
    }

    /** @test */
    public function it_throws_exception_when_reserving_non_pending_order()
    {
        // Arrange
        $salesOrder = SalesOrder::factory()->create(['status' => 'SHIPPED']);
        $user = User::factory()->create();

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Sales Order must be in PENDING status');

        $this->inventoryService->reserveStockForSalesOrder($salesOrder, $user->id);
    }
}
