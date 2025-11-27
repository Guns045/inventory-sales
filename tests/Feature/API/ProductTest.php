<?php

namespace Tests\Feature\API;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->user = User::factory()->create();
        $this->user->assignRole('Admin');
        $this->warehouse = Warehouse::factory()->create();
    }

    /** @test */
    public function can_list_products()
    {
        Product::factory()->count(5)->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'sku',
                        'name',
                        'current_stock',
                        'total_stock',
                        'reserved_stock'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_product()
    {
        Sanctum::actingAs($this->user);

        $category = Category::factory()->create();
        $supplier = Supplier::factory()->create();

        $data = [
            'sku' => 'TEST-SKU-001',
            'name' => 'Test Product',
            'description' => 'Test Description',
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
            'buy_price' => 10000,
            'sell_price' => 15000,
            'min_stock_level' => 10,
        ];

        $response = $this->postJson('/api/products', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['sku' => 'TEST-SKU-001']);

        $this->assertDatabaseHas('products', ['sku' => 'TEST-SKU-001']);
    }

    /** @test */
    public function can_show_product()
    {
        $product = Product::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $product->id]);
    }

    /** @test */
    public function can_update_product()
    {
        $product = Product::factory()->create();

        Sanctum::actingAs($this->user);

        $data = [
            'sku' => $product->sku,
            'name' => 'Updated Name',
            'description' => 'Updated Description',
            'buy_price' => 20000,
            'sell_price' => 25000,
            'min_stock_level' => 5,
        ];

        $response = $this->putJson("/api/products/{$product->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Name']);

        $this->assertDatabaseHas('products', ['name' => 'Updated Name']);
    }

    /** @test */
    public function can_delete_product()
    {
        $product = Product::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/products/{$product->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    /** @test */
    public function validates_duplicate_sku()
    {
        $product = Product::factory()->create(['sku' => 'EXISTING-SKU']);

        Sanctum::actingAs($this->user);

        $data = [
            'sku' => 'EXISTING-SKU',
            'name' => 'New Product',
            'buy_price' => 10000,
            'sell_price' => 15000,
            'min_stock_level' => 10,
        ];

        $response = $this->postJson('/api/products', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }
}
