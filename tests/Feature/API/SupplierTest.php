<?php

namespace Tests\Feature\API;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupplierTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);

        $this->user = User::factory()->create();
        $this->user->assignRole('Admin');
    }

    /** @test */
    public function can_list_suppliers()
    {
        Supplier::factory()->count(5)->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/suppliers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'contact_person',
                        'email',
                        'phone',
                        'address'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_supplier()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'Test Supplier',
            'contact_person' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '1234567890',
            'address' => '123 Test St',
        ];

        $response = $this->postJson('/api/suppliers', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Test Supplier']);

        $this->assertDatabaseHas('suppliers', ['name' => 'Test Supplier']);
    }

    /** @test */
    public function can_show_supplier()
    {
        $supplier = Supplier::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/suppliers/{$supplier->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $supplier->id]);
    }

    /** @test */
    public function can_update_supplier()
    {
        $supplier = Supplier::factory()->create();

        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'Updated Supplier',
            'contact_person' => 'Jane Doe',
            'email' => 'jane@example.com',
            'phone' => '0987654321',
            'address' => '456 Update St',
        ];

        $response = $this->putJson("/api/suppliers/{$supplier->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Supplier']);

        $this->assertDatabaseHas('suppliers', ['name' => 'Updated Supplier']);
    }

    /** @test */
    public function can_delete_supplier()
    {
        $supplier = Supplier::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/suppliers/{$supplier->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
    }

    /** @test */
    public function validates_required_fields()
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/suppliers', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }
}
