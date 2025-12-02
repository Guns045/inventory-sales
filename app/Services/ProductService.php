<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductService
{
    /**
     * Get all products with search and pagination
     *
     * @param array $filters
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getAllProducts(array $filters)
    {
        $query = Product::with(['category', 'supplier', 'productStock.warehouse']);

        // Search functionality
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('category', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $filters['per_page'] ?? 20;
        $products = $query->paginate($perPage);

        // Calculate stock information for each product
        $products->getCollection()->each(function ($product) {
            $this->enrichProductWithStockData($product);
        });

        return $products;
    }

    /**
     * Get a single product by ID with stock details
     *
     * @param int $id
     * @return Product
     */
    public function getProductById(int $id): Product
    {
        $product = Product::with(['category', 'supplier', 'productStock.warehouse'])->findOrFail($id);
        $this->enrichProductWithStockData($product);
        return $product;
    }

    /**
     * Create a new product
     *
     * @param array $data
     * @return Product
     */
    public function createProduct(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $product = Product::create($data);

            Log::info('Product created', [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name
            ]);

            return $product->load(['category', 'supplier']);
        });
    }

    /**
     * Update an existing product
     *
     * @param Product $product
     * @param array $data
     * @return Product
     */
    public function updateProduct(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            $product->update($data);

            Log::info('Product updated', [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name
            ]);

            return $product->load(['category', 'supplier']);
        });
    }

    /**
     * Delete a product
     *
     * @param Product $product
     * @return bool
     * @throws \Exception
     */
    public function deleteProduct(Product $product): bool
    {
        // Check if product has stock
        $hasStock = ProductStock::where('product_id', $product->id)
            ->where('quantity', '>', 0)
            ->exists();

        if ($hasStock) {
            throw new \Exception('Cannot delete product with existing stock. Please adjust stock to zero first.');
        }

        return DB::transaction(function () use ($product) {
            $productId = $product->id;
            $sku = $product->sku;

            $product->delete();

            Log::info('Product deleted', [
                'product_id' => $productId,
                'sku' => $sku
            ]);

            return true;
        });
    }

    /**
     * Bulk delete products
     *
     * @param array $ids
     * @return array
     */
    public function bulkDeleteProducts(array $ids): array
    {
        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];

        foreach ($ids as $id) {
            try {
                $product = Product::find($id);
                if ($product) {
                    $this->deleteProduct($product);
                    $results['success']++;
                }
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = "Product ID {$id}: " . $e->getMessage();
            }
        }

        return $results;
    }

    /**
     * Enrich product with calculated stock data
     *
     * @param Product $product
     * @return void
     */
    private function enrichProductWithStockData(Product $product): void
    {
        $totalQuantity = $product->productStock->sum('quantity');
        $totalReserved = $product->productStock->sum('reserved_quantity');

        $product->current_stock = $totalQuantity - $totalReserved;
        $product->total_stock = $totalQuantity;
        $product->reserved_stock = $totalReserved;

        // Organize stock by warehouse for detailed tracking
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
    }
}
