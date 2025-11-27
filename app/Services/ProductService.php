<?php

namespace App\Services;

use App\Models\Product;
<<<<<<< HEAD
use Illuminate\Support\Facades\DB;
=======
use App\Models\ProductStock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc

class ProductService
{
    /**
<<<<<<< HEAD
     * List products with filtering and pagination
     */
    public function listProducts(array $filters, int $perPage = 20)
    {
        $query = Product::with(['category', 'supplier', 'productStock.warehouse']);

=======
     * Get all products with search and pagination
     *
     * @param array $filters
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getAllProducts(array $filters)
    {
        $query = Product::with(['category', 'supplier', 'productStock.warehouse']);

        // Search functionality
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

<<<<<<< HEAD
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
=======
        $perPage = $filters['per_page'] ?? 20;
        $products = $query->paginate($perPage);

        // Calculate stock information for each product
        $products->getCollection()->each(function ($product) {
            $this->enrichProductWithStockData($product);
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
        });

        return $products;
    }

    /**
<<<<<<< HEAD
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
=======
     * Get a single product by ID with stock details
     *
     * @param int $id
     * @return Product
     */
    public function getProductById(int $id): Product
    {
        $product = Product::with(['category', 'supplier', 'productStock.warehouse'])->findOrFail($id);
        $this->enrichProductWithStockData($product);
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
        return $product;
    }

    /**
<<<<<<< HEAD
     * Update a product
     */
    public function updateProduct(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $product = Product::findOrFail($id);
            $product->update($data);
            return $product;
=======
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
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
        });
    }

    /**
     * Delete a product
<<<<<<< HEAD
     */
    public function deleteProduct(int $id)
    {
        return DB::transaction(function () use ($id) {
            $product = Product::findOrFail($id);
            $product->delete();
=======
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

>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
            return true;
        });
    }

    /**
<<<<<<< HEAD
     * Calculate stock details for a product
     */
    public function calculateStockDetails(Product $product)
=======
     * Enrich product with calculated stock data
     *
     * @param Product $product
     * @return void
     */
    private function enrichProductWithStockData(Product $product): void
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
    {
        $totalQuantity = $product->productStock->sum('quantity');
        $totalReserved = $product->productStock->sum('reserved_quantity');

        $product->current_stock = $totalQuantity - $totalReserved;
        $product->total_stock = $totalQuantity;
        $product->reserved_stock = $totalReserved;

<<<<<<< HEAD
        // Organize stock by warehouse
=======
        // Organize stock by warehouse for detailed tracking
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
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
<<<<<<< HEAD

        return $product;
=======
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
    }
}
