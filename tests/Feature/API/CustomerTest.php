<?php

namespace Tests\Feature\API;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerTest extends TestCase
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
    public function can_list_customers()
    {
        Customer::factory()->count(5)->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/customers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'company_name',
                        'contact_person',
                        'email',
                        'phone',
                        'address',
                        'tax_id'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_customer()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'company_name' => 'Test Company',
            'contact_person' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '1234567890',
            'address' => '123 Test St',
            'tax_id' => 'TAX-123',
        ];

        $response = $this->postJson('/api/customers', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['company_name' => 'Test Company']);

        $this->assertDatabaseHas('customers', ['company_name' => 'Test Company']);
    }

    /** @test */
    public function can_show_customer()
    {
        $customer = Customer::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/customers/{$customer->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $customer->id]);
    }

    /** @test */
    public function can_update_customer()
    {
        $customer = Customer::factory()->create();

        Sanctum::actingAs($this->user);

        $data = [
            'company_name' => 'Updated Company',
            'contact_person' => 'Jane Doe',
            'email' => 'jane@example.com',
            'phone' => '0987654321',
            'address' => '456 Update St',
            'tax_id' => 'TAX-456',
        ];

        $response = $this->putJson("/api/customers/{$customer->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['company_name' => 'Updated Company']);

        $this->assertDatabaseHas('customers', ['company_name' => 'Updated Company']);
    }

    /** @test */
    public function can_delete_customer()
    {
        $customer = Customer::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/customers/{$customer->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    /** @test */
    public function validates_required_fields()
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/customers', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['company_name']);
    }
}
