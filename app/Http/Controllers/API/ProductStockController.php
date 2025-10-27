<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProductStock;
use App\Models\Product;
use App\Models\Warehouse;

class ProductStockController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $productStock = ProductStock::with(['product', 'warehouse'])->paginate(10);
        return response()->json($productStock);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|integer|min:0',
            'reserved_quantity' => 'required|integer|min:0',
        ]);

        // Check if combination already exists
        $existing = ProductStock::where('product_id', $request->product_id)
            ->where('warehouse_id', $request->warehouse_id)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Product stock record already exists for this product and warehouse'], 422);
        }

        $productStock = ProductStock::create($request->all());

        return response()->json($productStock, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $productStock = ProductStock::with(['product', 'warehouse'])->findOrFail($id);
        return response()->json($productStock);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $productStock = ProductStock::findOrFail($id);

        $request->validate([
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|integer|min:0',
            'reserved_quantity' => 'required|integer|min:0',
        ]);

        // Ensure the combination doesn't already exist for a different record
        $existing = ProductStock::where('product_id', $request->product_id)
            ->where('warehouse_id', $request->warehouse_id)
            ->where('id', '!=', $id)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Product stock record already exists for this product and warehouse'], 422);
        }

        $productStock->update($request->all());

        return response()->json($productStock);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $productStock = ProductStock::findOrFail($id);
        $productStock->delete();

        return response()->json(['message' => 'Product stock deleted successfully']);
    }
}
