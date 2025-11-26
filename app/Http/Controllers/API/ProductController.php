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
            $product = $this->productService->createProduct($request->validated());
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
}
