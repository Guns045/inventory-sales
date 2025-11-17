<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Product::with(['category', 'supplier', 'productStock.warehouse']);

        // Search functionality
        $search = $request->get('search', '');
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Paginate with requested per_page or default to 20
        $perPage = $request->get('per_page', 20);
        $products = $query->paginate($perPage);

        // Calculate current stock for each product and organize stock by warehouse
        $products->getCollection()->each(function ($product) {
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
        });

        return response()->json($products);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'sku' => 'required|string|max:255|unique:products',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'buy_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'min_stock_level' => 'required|integer|min:0',
        ]);

        $product = Product::create($request->all());

        return response()->json($product, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $product = Product::with(['category', 'supplier', 'productStock.warehouse'])->findOrFail($id);

        // Calculate current stock
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

        return response()->json($product);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($product->id)],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'buy_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'min_stock_level' => 'required|integer|min:0',
        ]);

        $product->update($request->all());

        return response()->json($product);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }
}
