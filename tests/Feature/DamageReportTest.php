<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use Laravel\Sanctum\Sanctum;
use Database\Seeders\RoleSeeder;
use Database\Seeders\PermissionSeeder;

class DamageReportTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $warehouse;
    protected $product;
    protected $productStock;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed permissions and roles
        $this->seed(PermissionSeeder::class);
        $this->seed(RoleSeeder::class);

        // Create a warehouse
        $this->warehouse = Warehouse::factory()->create();

        // Create a user with necessary permissions
        $this->user = User::factory()->create(['warehouse_id' => $this->warehouse->id]);

        // Ensure Super Admin role exists for web guard (User model default)
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $this->user->assignRole('Super Admin'); // Give super admin for ease of testing all permissions

        // Create a product
        $this->product = Product::factory()->create();

        // Create initial stock
        $this->productStock = ProductStock::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
            'available_quantity' => 100,
            'damaged_quantity' => 0,
            'bin_location' => 'A-01'
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_can_report_damaged_stock()
    {
        $response = $this->postJson('/api/product-stock/damage', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 5,
            'reason' => 'DAMAGED',
            'notes' => 'Test note',
            'reference_number' => 'REF-001'
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify stock updated
        $this->assertDatabaseHas('product_stock', [
            'id' => $this->productStock->id,
            'quantity' => 100,
            'available_quantity' => 95,
            'damaged_quantity' => 5
        ]);

        // Verify movement created
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'type' => 'DAMAGE',
            'quantity_change' => -5,
            'reference_number' => 'REF-001'
        ]);
    }

    public function test_cannot_report_damage_exceeding_available_stock()
    {
        $response = $this->postJson('/api/product-stock/damage', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 150, // More than 100
            'reason' => 'Flood',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_reverse_damaged_stock()
    {
        // First report some damage
        $this->productStock->update([
            'available_quantity' => 90,
            'damaged_quantity' => 10
        ]);

        $response = $this->postJson('/api/product-stock/damage/reverse', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 3,
            'notes' => 'Mistake correction'
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify stock updated
        $this->assertDatabaseHas('product_stock', [
            'id' => $this->productStock->id,
            'available_quantity' => 93, // 90 + 3
            'damaged_quantity' => 7   // 10 - 3
        ]);

        // Verify movement created
        $this->assertDatabaseHas('stock_movements', [
            'type' => 'DAMAGE_REVERSAL',
            'quantity_change' => 3,
        ]);
    }

    public function test_can_dispose_damaged_stock()
    {
        // First report some damage
        $this->productStock->update([
            'quantity' => 100,
            'available_quantity' => 90,
            'damaged_quantity' => 10
        ]);

        $response = $this->postJson('/api/product-stock/damage/dispose', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 4,
            'notes' => 'Thrown away',
            'reference_number' => 'DISP-001'
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify stock updated (Total quantity reduces)
        $this->assertDatabaseHas('product_stock', [
            'id' => $this->productStock->id,
            'quantity' => 96, // 100 - 4
            'available_quantity' => 90, // Unchanged
            'damaged_quantity' => 6   // 10 - 4
        ]);

        // Verify movement created
        $this->assertDatabaseHas('stock_movements', [
            'type' => 'DISPOSAL',
            'quantity_change' => -4,
        ]);
    }

    public function test_can_get_damage_report()
    {
        StockMovement::create([
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouse->id,
            'type' => 'DAMAGE',
            'quantity_change' => -5,
            'previous_quantity' => 100,
            'new_quantity' => 95,
            'created_by' => $this->user->id,
            'reference_type' => 'DAMAGE_REPORT'
        ]);

        $response = $this->getJson('/api/product-stock/damage-report');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'movements' => ['data'],
                'stats' => ['total_damaged_items']
            ]);
    }
}
