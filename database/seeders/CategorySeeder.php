<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Engine Parts'],
            ['name' => 'Filters'],
            ['name' => 'Hydraulics'],
            ['name' => 'Transmission'],
            ['name' => 'Electrical'],
            ['name' => 'Brakes'],
            ['name' => 'Suspension'],
            ['name' => ' bearings'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}