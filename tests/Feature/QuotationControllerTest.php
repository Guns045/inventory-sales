<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class QuotationControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        Permission::firstOrCreate(['name' => 'quotations.read']);
        Permission::firstOrCreate(['name' => 'quotations.create']);
        Permission::firstOrCreate(['name' => 'quotations.update']);
        Permission::firstOrCreate(['name' => 'quotations.delete']);

        // Create Admin role
        Role::firstOrCreate(['name' => 'Admin']);

        // Create user with permissions
        $this->user = User::factory()->create();
        $this->user->givePermissionTo([
            'quotations.read',
            'quotations.create',
            'quotations.update',
            'quotations.delete'
        ]);

        $this->warehouse = Warehouse::factory()->create();
    }

    public function test_index_returns_quotations()
    {
        Quotation::factory()->count(3)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/quotations');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_store_creates_quotation()
    {
        $customer = Customer::factory()->create();
        $product = Product::factory()->create();

        $data = [
            'customer_id' => $customer->id,
            'warehouse_id' => $this->warehouse->id,
            'valid_until' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'DRAFT',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'unit_price' => 100,
                    'discount_percentage' => 0,
                    'tax_rate' => 11
                ]
            ]
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/quotations', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['status' => 'DRAFT']);

        $this->assertDatabaseHas('quotations', [
            'customer_id' => $customer->id,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $this->assertDatabaseHas('quotation_items', [
            'product_id' => $product->id,
            'quantity' => 5,
        ]);
    }

    public function test_show_returns_quotation()
    {
        $quotation = Quotation::factory()->create();

        $response = $this->actingAs($this->user)
            ->getJson("/api/quotations/{$quotation->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $quotation->id]);
    }

    public function test_update_modifies_quotation()
    {
        $quotation = Quotation::factory()->create(['status' => 'DRAFT']);
        $newCustomer = Customer::factory()->create();

        $data = [
            'customer_id' => $newCustomer->id,
            'warehouse_id' => $quotation->warehouse_id,
            'valid_until' => $quotation->valid_until->format('Y-m-d'),
            'status' => 'DRAFT',
            'items' => [] // Assuming update handles empty items or we need to provide them
        ];

        // If update requires items, we should provide them. 
        // Based on QuotationForm, it sends items.
        // Let's add items to be safe.
        $product = Product::factory()->create();
        $data['items'] = [
            [
                'product_id' => $product->id,
                'quantity' => 10,
                'unit_price' => 200,
                'discount_percentage' => 0,
                'tax_rate' => 11,
            ]
        ];

        $response = $this->actingAs($this->user)
            ->putJson("/api/quotations/{$quotation->id}", $data);

        $response->assertStatus(200);

        $this->assertDatabaseHas('quotations', [
            'id' => $quotation->id,
            'customer_id' => $newCustomer->id,
        ]);
    }

    public function test_destroy_deletes_quotation()
    {
        $quotation = Quotation::factory()->create();

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/quotations/{$quotation->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('quotations', ['id' => $quotation->id]);
    }
}
