<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    protected $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $filters = [
                'search' => $request->get('search', ''),
                'per_page' => $request->get('per_page', 20),
            ];

            $products = $this->productService->getAllProducts($filters);
            return ProductResource::collection($products);

        } catch (\Exception $e) {
            Log::error('Product Index Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProductRequest $request)
    {
        try {
            $data = $request->validated();
            $data['min_stock_level'] = $data['min_stock_level'] ?? 0;
            $product = $this->productService->createProduct($data);
            return new ProductResource($product);

        } catch (\Exception $e) {
            Log::error('Product Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $product = $this->productService->getProductById($id);
            return new ProductResource($product);

        } catch (\Exception $e) {
            Log::error('Product Show Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Product not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProductRequest $request, $id)
    {
        try {
            $product = Product::findOrFail($id);
            $product = $this->productService->updateProduct($product, $request->validated());
            return new ProductResource($product);

        } catch (\Exception $e) {
            Log::error('Product Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $product = Product::findOrFail($id);
            $this->productService->deleteProduct($product);

            return response()->json(['message' => 'Product deleted successfully']);

        } catch (\Exception $e) {
            Log::error('Product Delete Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete product',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Remove multiple resources from storage.
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:products,id'
        ]);

        try {
            $results = $this->productService->bulkDeleteProducts($request->ids);

            if ($results['failed'] > 0) {
                return response()->json([
                    'message' => 'Bulk delete completed with some errors',
                    'results' => $results
                ], 207); // 207 Multi-Status
            }

            return response()->json([
                'message' => 'Products deleted successfully',
                'results' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Product Bulk Delete Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete products',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get product statistics
     */
    public function getStatistics()
    {
        try {
            // Eager load productStock to avoid N+1 and allow accessor to work efficiently
            $products = Product::with('productStock')->get();

            $total = $products->count();

            // Use the current_stock accessor (quantity - reserved)
            $outOfStock = $products->filter(function ($product) {
                return $product->current_stock <= 0;
            })->count();

            $inStock = $products->filter(function ($product) {
                return $product->current_stock > 0;
            })->count();

            $lowStock = $products->filter(function ($product) {
                return $product->current_stock > 0 && $product->current_stock <= $product->min_stock_level;
            })->count();

            // Calculate total value (quantity * sell_price)
            // We can calculate this in PHP or via DB query. DB query is faster for sum.
            // But since we already have products loaded, we can do it here if memory allows.
            // For 638 products, it's fine.
            $totalValue = $products->sum(function ($product) {
                return $product->total_stock * $product->sell_price;
            });

            return response()->json([
                'total' => $total,
                'in_stock' => $inStock,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
                'total_value' => $totalValue
            ]);

        } catch (\Exception $e) {
            Log::error('Product Statistics Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
