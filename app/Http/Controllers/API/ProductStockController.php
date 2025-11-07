<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProductStock;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ProductStockController extends Controller
{
    /**
     * Display a listing of the resource with role-based filtering.
     */
    public function index(Request $request)
    {
        $viewMode = $request->get('view_mode', 'per-warehouse');
        $search = $request->get('search', '');

        $query = ProductStock::with(['product', 'warehouse']);

        // Search functionality
        if ($search) {
            $query->whereHas('product', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Role-based filtering
        $user = Auth::user();
        if ($user && $user->role->name !== 'Super Admin') {
            // TODO: Implement user warehouse assignment logic
            // $query->whereIn('warehouse_id', $user->assignedWarehouses);
        }

        if ($viewMode === 'consolidated') {
            // Consolidated view - aggregate across warehouses
            $stocks = $query->selectRaw('
                    product_id,
                    SUM(quantity) as total_quantity,
                    SUM(reserved_quantity) as total_reserved,
                    SUM(quantity - reserved_quantity) as total_available,
                    MIN(min_stock_level) as min_stock_level
                ')
                ->groupBy('product_id')
                ->with('product')
                ->paginate(20);

            // Transform data for frontend
            $data = $stocks->getCollection()->map(function($item) {
                return [
                    'id' => 'consolidated_' . $item->product_id,
                    'product_id' => $item->product_id,
                    'product' => $item->product,
                    'warehouse' => (object) [
                        'code' => 'ALL',
                        'name' => 'All Warehouses'
                    ],
                    'quantity' => $item->total_quantity,
                    'reserved_quantity' => $item->total_reserved,
                    'min_stock_level' => $item->min_stock_level,
                    'view_mode' => 'consolidated'
                ];
            });

            $stocks->setCollection($data);
        } else {
            // Per-warehouse view
            $stocks = $query->paginate(20);

            // Add calculated available quantity
            $data = $stocks->getCollection()->map(function($item) {
                $item->available_quantity = $item->quantity - $item->reserved_quantity;
                $item->view_mode = 'per-warehouse';
                return $item;
            });

            $stocks->setCollection($data);
        }

        return response()->json($stocks);
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

    /**
     * Adjust stock quantity manually.
     */
    public function adjustStock(Request $request)
    {
        $request->validate([
            'product_stock_id' => 'required|exists:product_stocks,id',
            'adjustment_type' => 'required|in:increase,decrease',
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string',
            'notes' => 'nullable|string'
        ]);

        return DB::transaction(function () use ($request) {
            $productStock = ProductStock::findOrFail($request->product_stock_id);

            $quantityChange = $request->quantity;
            if ($request->adjustment_type === 'decrease') {
                $quantityChange = -$quantityChange;

                // Validate sufficient stock
                if ($productStock->quantity < $request->quantity) {
                    throw new \Exception('Insufficient stock for adjustment');
                }
            }

            // Update stock quantity
            $productStock->quantity += $quantityChange;
            $productStock->save();

            // Create stock movement record
            StockMovement::create([
                'product_id' => $productStock->product_id,
                'warehouse_id' => $productStock->warehouse_id,
                'type' => $request->adjustment_type === 'increase' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                'quantity_change' => $quantityChange,
                'reference_type' => 'App\Models\ProductStock',
                'reference_id' => $productStock->id,
                'reason' => $request->reason,
                'notes' => $request->notes,
                'user_id' => Auth::id(),
                'previous_quantity' => $productStock->quantity - $quantityChange,
                'new_quantity' => $productStock->quantity
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Stock adjusted successfully',
                'new_quantity' => $productStock->quantity,
                'adjustment_type' => $request->adjustment_type,
                'quantity_changed' => $request->quantity
            ]);
        });
    }

    /**
     * Get stock movement history for a product stock.
     */
    public function getMovementHistory($productStockId)
    {
        $productStock = ProductStock::findOrFail($productStockId);

        $movements = StockMovement::where('product_id', $productStock->product_id)
            ->where('warehouse_id', $productStock->warehouse_id)
            ->with(['user'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($movements);
    }
}
