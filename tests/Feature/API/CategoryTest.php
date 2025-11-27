<?php

namespace Tests\Feature\API;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryTest extends TestCase
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
    public function can_list_categories()
    {
        Category::factory()->count(5)->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'description'
                    ]
                ]
            ]);
    }

    /** @test */
    public function can_create_category()
    {
        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'Test Category',
            'description' => 'Test Description',
        ];

        $response = $this->postJson('/api/categories', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Test Category']);

        $this->assertDatabaseHas('categories', ['name' => 'Test Category']);
    }

    /** @test */
    public function can_show_category()
    {
        $category = Category::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/categories/{$category->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $category->id]);
    }

    /** @test */
    public function can_update_category()
    {
        $category = Category::factory()->create();

        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'Updated Category',
            'description' => 'Updated Description',
        ];

        $response = $this->putJson("/api/categories/{$category->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Category']);

        $this->assertDatabaseHas('categories', ['name' => 'Updated Category']);
    }

    /** @test */
    public function can_delete_category()
    {
        $category = Category::factory()->create();

        Sanctum::actingAs($this->user);

        $response = $this->deleteJson("/api/categories/{$category->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    /** @test */
    public function validates_duplicate_name()
    {
        $category = Category::factory()->create(['name' => 'Existing Category']);

        Sanctum::actingAs($this->user);

        $data = [
            'name' => 'Existing Category',
        ];

        $response = $this->postJson('/api/categories', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }
}
