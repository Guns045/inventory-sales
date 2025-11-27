<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

class ProductService
{
    /**
     * List products with filtering and pagination
     */
    public function listProducts(array $filters, int $perPage = 20)
    {
        $query = Product::with(['category', 'supplier', 'productStock.warehouse']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        $products = $query->paginate($perPage);

        // Calculate stock details for each product
        $products->getCollection()->each(function ($product) {
            $this->calculateStockDetails($product);
        });

        return $products;
    }

    /**
     * Create a new product
     */
    public function createProduct(array $data)
    {
        return DB::transaction(function () use ($data) {
            return Product::create($data);
        });
    }

    /**
     * Get a single product with details
     */
    public function getProduct(int $id)
    {
        $product = Product::with(['category', 'supplier', 'productStock.warehouse'])->findOrFail($id);
        $this->calculateStockDetails($product);
        return $product;
    }

    /**
     * Update a product
     */
    public function updateProduct(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $product = Product::findOrFail($id);
            $product->update($data);
            return $product;
        });
    }

    /**
     * Delete a product
     */
    public function deleteProduct(int $id)
    {
        return DB::transaction(function () use ($id) {
            $product = Product::findOrFail($id);
            $product->delete();
            return true;
        });
    }

    /**
     * Calculate stock details for a product
     */
    public function calculateStockDetails(Product $product)
    {
        $totalQuantity = $product->productStock->sum('quantity');
        $totalReserved = $product->productStock->sum('reserved_quantity');

        $product->current_stock = $totalQuantity - $totalReserved;
        $product->total_stock = $totalQuantity;
        $product->reserved_stock = $totalReserved;

        // Organize stock by warehouse
        $product->warehouse_stocks = $product->productStock->map(function ($stock) {
            return [
                'warehouse_id' => $stock->warehouse_id,
                'warehouse_name' => $stock->warehouse->name ?? 'Unknown',
                'warehouse_location' => $stock->warehouse->location ?? 'Unknown',
                'warehouse_code' => $stock->warehouse->code ?? 'N/A',
                'quantity' => $stock->quantity,
                'reserved_quantity' => $stock->reserved_quantity,
                'available_quantity' => $stock->quantity - $stock->reserved_quantity
            ];
        });

        return $product;
    }
}
