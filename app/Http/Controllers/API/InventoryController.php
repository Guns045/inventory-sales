<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeductStockRequest;
use App\Http\Requests\ReserveStockRequest;
use App\Http\Resources\InventoryResource;
use App\Models\SalesOrder;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * Deduct stock when sales order is shipped
     */
    public function deductStock(DeductStockRequest $request)
    {
        try {
            DB::beginTransaction();

            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($request->sales_order_id);

            $stockMovements = $this->inventoryService->deductStockForSalesOrder($salesOrder, auth()->id());

            DB::commit();

            return response()->json([
                'message' => 'Stock deducted successfully',
                'sales_order' => $salesOrder->load(['items.product']),
                'stock_movements' => $stockMovements
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deducting stock: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error deducting stock: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Reserve stock when sales order is created
     */
    public function reserveStock(ReserveStockRequest $request)
    {
        try {
            DB::beginTransaction();

            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($request->sales_order_id);

            $this->inventoryService->reserveStockForSalesOrder($salesOrder, auth()->id());

            DB::commit();

            return response()->json([
                'message' => 'Stock reserved successfully',
                'sales_order' => $salesOrder->load(['items.product'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error reserving stock: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error reserving stock: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get current stock levels
     */
    public function getStockLevels()
    {
        try {
            $stockLevels = ProductStock::with(['product'])->get();
            return InventoryResource::collection($stockLevels);

        } catch (\Exception $e) {
            Log::error('Error getting stock levels: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error getting stock levels: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get stock movements for a specific product
     */
    public function getProductMovements($productId)
    {
        try {
            $movements = StockMovement::with(['product', 'creator'])
                ->where('product_id', $productId)
                ->orderBy('created_at', 'desc')
                ->paginate(50);

            return response()->json($movements);

        } catch (\Exception $e) {
            Log::error('Error getting product movements: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error getting product movements: ' . $e->getMessage()
            ], 500);
        }
    }
}