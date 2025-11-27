<?php

namespace Tests\Feature\API;

use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WarehouseTest extends TestCase
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
    public function can_list_warehouses()
    {
        Warehouse::factory()->count(5)->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/warehouses');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'location',
                        'code',
                        'is_active',
                        'capacity',
                        'manager_id'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_warehouse()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'Test Warehouse',
            'location' => 'Test Location',
            'code' => 'WH-TEST-001',
            'is_active' => true,
            'capacity' => 1000,
        ];

        $response = $this->postJson('/api/warehouses', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Test Warehouse']);

        $this->assertDatabaseHas('warehouses', ['code' => 'WH-TEST-001']);
    }

    /** @test */
    public function can_show_warehouse()
    {
        $warehouse = Warehouse::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/warehouses/{$warehouse->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $warehouse->id]);
    }

    /** @test */
    public function can_update_warehouse()
    {
        $warehouse = Warehouse::factory()->create();

        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'Updated Warehouse',
            'location' => 'Updated Location',
            'code' => $warehouse->code, // Keep same code
            'is_active' => false,
            'capacity' => 2000,
        ];

        $response = $this->putJson("/api/warehouses/{$warehouse->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Warehouse']);

        $this->assertDatabaseHas('warehouses', ['name' => 'Updated Warehouse']);
    }

    /** @test */
    public function can_delete_warehouse()
    {
        $warehouse = Warehouse::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/warehouses/{$warehouse->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('warehouses', ['id' => $warehouse->id]);
    }

    /** @test */
    public function validates_duplicate_code()
    {
        $warehouse = Warehouse::factory()->create(['code' => 'EXISTING-CODE']);

        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'New Warehouse',
            'location' => 'New Location',
            'code' => 'EXISTING-CODE',
        ];

        $response = $this->postJson('/api/warehouses', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }
}
