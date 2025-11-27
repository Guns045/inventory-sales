<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductStockRequest;
use App\Http\Requests\UpdateProductStockRequest;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Resources\ProductStockResource;
use App\Models\ProductStock;
use App\Services\ProductStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProductStockController extends Controller
{
    protected $productStockService;

    public function __construct(ProductStockService $productStockService)
    {
        $this->productStockService = $productStockService;
    }

    /**
     * Display a listing of the resource with role-based filtering.
     */
    public function index(Request $request)
    {
        try {
            $filters = [
                'view_mode' => $request->get('view_mode', 'per-warehouse'),
                'search' => $request->get('search', ''),
                'warehouse_id' => $request->get('warehouse_id', ''),
                'per_page' => $request->get('per_page', 10),
            ];

            $stocks = $this->productStockService->getStockLevels($filters, $request->user());
            return ProductStockResource::collection($stocks);

<<<<<<< HEAD
        // Search functionality
        if ($search) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Warehouse filter
        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        // Role-based filtering
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin')) {
            // Sales role can view all warehouse stock data
            if ($user->hasRole('Sales')) {
                // Sales role can see all warehouses - no warehouse filtering
            } else {
                // Filter other roles by assigned warehouse
                if ($user->warehouse_id) {
                    $query->where('warehouse_id', $user->warehouse_id);
                }
            }
        }

        if ($viewMode === 'consolidated') {
            // Consolidated view - aggregate across warehouses
            $stocks = $query->join('products', 'product_stock.product_id', '=', 'products.id')
                ->selectRaw('
                    product_stock.product_id,
                    SUM(product_stock.quantity) as total_quantity,
                    SUM(product_stock.reserved_quantity) as total_reserved,
                    SUM(product_stock.quantity - product_stock.reserved_quantity) as total_available,
                    MIN(products.min_stock_level) as min_stock_level
                ')
                ->groupBy('product_stock.product_id')
                ->with('product')
                ->paginate($request->get('per_page', 10));

            // Transform data for frontend
            $data = $stocks->getCollection()->map(function ($item) {
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
            $stocks = $query->paginate($request->get('per_page', 10));

            // Add calculated available quantity
            $data = $stocks->getCollection()->map(function ($item) {
                $item->available_quantity = $item->quantity - $item->reserved_quantity;
                $item->view_mode = 'per-warehouse';
                return $item;
            });

            $stocks->setCollection($data);
        }

        return response()->json($stocks);
=======
        } catch (\Exception $e) {
            Log::error('ProductStock Index Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching stock levels',
                'error' => $e->getMessage()
            ], 500);
        }
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProductStockRequest $request)
    {
        try {
            $productStock = $this->productStockService->createStock($request->validated());
            return new ProductStockResource($productStock);

        } catch (\Exception $e) {
            Log::error('ProductStock Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create product stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $productStock = ProductStock::with(['product', 'warehouse'])->findOrFail($id);
            return new ProductStockResource($productStock);

        } catch (\Exception $e) {
            Log::error('ProductStock Show Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Product stock not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProductStockRequest $request, $id)
    {
        try {
            $productStock = ProductStock::findOrFail($id);
            $productStock = $this->productStockService->updateStock($productStock, $request->validated());
            return new ProductStockResource($productStock);

        } catch (\Exception $e) {
            Log::error('ProductStock Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update product stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $productStock = ProductStock::findOrFail($id);
            $this->productStockService->deleteStock($productStock);

            return response()->json(['message' => 'Product stock deleted successfully']);

        } catch (\Exception $e) {
            Log::error('ProductStock Delete Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete product stock',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Adjust stock quantity manually.
     */
    public function adjustStock(AdjustStockRequest $request)
    {
<<<<<<< HEAD
        $request->validate([
            'product_stock_id' => 'required|exists:product_stock,id',
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
                'type' => 'ADJUSTMENT',
                'quantity_change' => $quantityChange,
                'reference_type' => 'App\Models\ProductStock',
                'reference_id' => $productStock->id,
                'reason' => $request->reason,
                'notes' => $request->notes,
                'user_id' => Auth::id(),
                'previous_quantity' => $productStock->quantity - $quantityChange,
                'new_quantity' => $productStock->quantity
            ]);
=======
        try {
            $result = $this->productStockService->adjustStock($request->validated());
            return response()->json($result);
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc

        } catch (\Exception $e) {
            Log::error('Stock Adjustment Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to adjust stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get stock movement history for a product stock.
     */
    public function getMovementHistory($productStockId)
    {
        try {
            $movements = $this->productStockService->getMovementHistory($productStockId);
            return response()->json($movements);

        } catch (\Exception $e) {
            Log::error('Movement History Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch movement history',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
