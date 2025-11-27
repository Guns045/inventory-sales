<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Facades\DB;

class CategoryService
{
    /**
     * List categories with pagination
     */
    public function listCategories(int $perPage = 20)
    {
        return Category::paginate($perPage);
    }

    /**
     * Create a new category
     */
    public function createCategory(array $data)
    {
        return DB::transaction(function () use ($data) {
            return Category::create($data);
        });
    }

    /**
     * Get a single category
     */
    public function getCategory(int $id)
    {
        return Category::findOrFail($id);
    }

    /**
     * Update a category
     */
    public function updateCategory(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $category = Category::findOrFail($id);
            $category->update($data);
            return $category;
        });
    }

    /**
     * Delete a category
     */
    public function deleteCategory(int $id)
    {
        return DB::transaction(function () use ($id) {
            $category = Category::findOrFail($id);
            $category->delete();
            return true;
        });
    }
}
