<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\ProductService;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\Eloquent\Collection;

class ProductServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $productService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->productService = new ProductService();
    }

    /** @test */
    public function it_can_get_all_products_with_pagination()
    {
        // Arrange
        Product::factory()->count(25)->create();

        // Act
        $result = $this->productService->getAllProducts(['per_page' => 10]);

        // Assert
        $this->assertEquals(10, $result->count());
        $this->assertEquals(25, $result->total());
    }

    /** @test */
    public function it_can_search_products_by_name()
    {
        // Arrange
        Product::factory()->create(['name' => 'Test Product Alpha']);
        Product::factory()->create(['name' => 'Test Product Beta']);
        Product::factory()->create(['name' => 'Other Product']);

        // Act
        $result = $this->productService->getAllProducts(['search' => 'Alpha']);

        // Assert
        $this->assertEquals(1, $result->total());
        $this->assertEquals('Test Product Alpha', $result->first()->name);
    }

    /** @test */
    public function it_can_search_products_by_sku()
    {
        // Arrange
        Product::factory()->create(['sku' => 'SKU-001', 'name' => 'Product 1']);
        Product::factory()->create(['sku' => 'SKU-002', 'name' => 'Product 2']);

        // Act
        $result = $this->productService->getAllProducts(['search' => 'SKU-001']);

        // Assert
        $this->assertEquals(1, $result->total());
        $this->assertEquals('SKU-001', $result->first()->sku);
    }

    /** @test */
    public function it_prioritizes_exact_matches_in_search()
    {
        // Arrange
        // Create products that all match "WG9725522281" partially
        Product::factory()->create(['sku' => 'WG9725522281+005', 'name' => 'Rear leaf spring No.5']);
        Product::factory()->create(['sku' => 'WG9725522281+004', 'name' => 'Rear leaf spring No.4']);
        Product::factory()->create(['sku' => 'WG9725522281', 'name' => 'Rear leaf spring']); // Exact match
        Product::factory()->create(['sku' => 'WG9725522281+003', 'name' => 'Rear leaf spring No.3']);

        // Act
        $result = $this->productService->getAllProducts(['search' => 'WG9725522281']);

        // Assert
        $this->assertEquals(4, $result->total());

        // The first result should be the exact match
        $this->assertEquals('WG9725522281', $result->items()[0]->sku);

        // The subsequent results should be sorted by SKU ascending (secondary sort)
        // WG9725522281+003, WG9725522281+004, WG9725522281+005
        $this->assertEquals('WG9725522281+003', $result->items()[1]->sku);
        $this->assertEquals('WG9725522281+004', $result->items()[2]->sku);
        $this->assertEquals('WG9725522281+005', $result->items()[3]->sku);
    }

    /** @test */
    public function it_enriches_products_with_stock_data()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse1 = \App\Models\Warehouse::factory()->create();
        $warehouse2 = \App\Models\Warehouse::factory()->create();

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
        $result = $this->productService->getProductById($product->id);

        // Assert
        $this->assertEquals(150, $result->total_stock);
        $this->assertEquals(30, $result->reserved_stock);
        $this->assertEquals(120, $result->current_stock);
        $this->assertCount(2, $result->warehouse_stocks);
    }

    /** @test */
    public function it_can_create_a_product()
    {
        // Arrange
        $category = Category::factory()->create();
        $supplier = Supplier::factory()->create();

        $data = [
            'sku' => 'TEST-SKU-001',
            'name' => 'Test Product',
            'description' => 'Test Description',
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
            'buy_price' => 100,
            'sell_price' => 150,
            'min_stock_level' => 10,
        ];

        // Act
        $product = $this->productService->createProduct($data);

        // Assert
        $this->assertDatabaseHas('products', [
            'sku' => 'TEST-SKU-001',
            'name' => 'Test Product',
        ]);
        $this->assertEquals('TEST-SKU-001', $product->sku);
    }

    /** @test */
    public function it_can_update_a_product()
    {
        // Arrange
        $product = Product::factory()->create([
            'name' => 'Original Name',
            'sell_price' => 100
        ]);

        $updateData = [
            'sku' => $product->sku,
            'name' => 'Updated Name',
            'description' => $product->description,
            'category_id' => $product->category_id,
            'supplier_id' => $product->supplier_id,
            'buy_price' => $product->buy_price,
            'sell_price' => 200,
            'min_stock_level' => $product->min_stock_level,
        ];

        // Act
        $updated = $this->productService->updateProduct($product, $updateData);

        // Assert
        $this->assertEquals('Updated Name', $updated->name);
        $this->assertEquals(200, $updated->sell_price);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Name',
            'sell_price' => 200
        ]);
    }

    /** @test */
    public function it_can_delete_a_product_without_stock()
    {
        // Arrange
        $product = Product::factory()->create();

        // Act
        $result = $this->productService->deleteProduct($product);

        // Assert
        $this->assertTrue($result);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    /** @test */
    public function it_cannot_delete_a_product_with_stock()
    {
        // Arrange
        $product = Product::factory()->create();
        $warehouse = \App\Models\Warehouse::factory()->create();

        ProductStock::factory()->create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 10,
        ]);

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot delete product with existing stock');

        $this->productService->deleteProduct($product);
    }

    /** @test */
    public function it_returns_product_with_relationships()
    {
        // Arrange
        $category = Category::factory()->create();
        $supplier = Supplier::factory()->create();
        $product = Product::factory()->create([
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
        ]);

        // Act
        $result = $this->productService->getProductById($product->id);

        // Assert
        $this->assertNotNull($result->category);
        $this->assertNotNull($result->supplier);
        $this->assertEquals($category->id, $result->category->id);
        $this->assertEquals($supplier->id, $result->supplier->id);
    }
}
