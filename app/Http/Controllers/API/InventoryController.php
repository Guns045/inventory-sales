<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SalesOrder;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\SalesOrderItem;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InventoryController extends Controller
{
    /**
     * Deduct stock when sales order is shipped
     * This implements the stock deduction mentioned in specifications
     */
    public function deductStock(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
        ]);

        try {
            DB::beginTransaction();

            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($request->sales_order_id);

            if ($salesOrder->status !== 'SHIPPED') {
                throw new \Exception('Sales Order must be in SHIPPED status to deduct stock.');
            }

            $stockMovements = [];

            foreach ($salesOrder->items as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)->first();

                if (!$productStock) {
                    throw new \Exception("No stock record found for product ID: {$item->product_id}");
                }

                // Calculate actual quantity to deduct
                $actualQuantity = min($item->quantity, $productStock->quantity);

                if ($actualQuantity > 0) {
                    // Update stock quantities
                    $newQuantity = $productStock->quantity - $actualQuantity;
                    $newReserved = max(0, $productStock->reserved_quantity - $actualQuantity);

                    $productStock->update([
                        'quantity' => $newQuantity,
                        'reserved_quantity' => $newReserved,
                    ]);

                    // Create stock movement record
                    $stockMovement = StockMovement::create([
                        'product_id' => $item->product_id,
                        'type' => 'OUT',
                        'quantity' => $actualQuantity,
                        'previous_quantity' => $productStock->quantity + $actualQuantity,
                        'new_quantity' => $newQuantity,
                        'movement_date' => now(),
                        'reference_type' => 'SalesOrder',
                        'reference_id' => $salesOrder->id,
                        'reference_number' => $salesOrder->sales_order_number,
                        'created_by' => auth()->id(),
                        'notes' => "Stock deducted for Sales Order {$salesOrder->sales_order_number}",
                    ]);

                    $stockMovements[] = $stockMovement;
                }
            }

            // Update sales order status to COMPLETED
            $salesOrder->update(['status' => 'COMPLETED']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Deducted stock for Sales Order ' . $salesOrder->sales_order_number,
                'module' => 'Inventory',
                'data_id' => $salesOrder->id,
            ]);

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
    public function reserveStock(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
        ]);

        try {
            DB::beginTransaction();

            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($request->sales_order_id);

            if ($salesOrder->status !== 'PENDING') {
                throw new \Exception('Sales Order must be in PENDING status to reserve stock.');
            }

            foreach ($salesOrder->items as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)->first();

                if (!$productStock) {
                    throw new \Exception("No stock record found for product ID: {$item->product_id}");
                }

                // Calculate reserved quantity
                $availableQuantity = $productStock->quantity - $productStock->reserved_quantity;
                $reserveQuantity = min($item->quantity, $availableQuantity);

                if ($reserveQuantity > 0) {
                    $productStock->increment('reserved_quantity', $reserveQuantity);

                    // Log stock reservation
                    StockMovement::create([
                        'product_id' => $item->product_id,
                        'type' => 'RESERVATION',
                        'quantity' => $reserveQuantity,
                        'previous_quantity' => $productStock->reserved_quantity - $reserveQuantity,
                        'new_quantity' => $productStock->reserved_quantity,
                        'movement_date' => now(),
                        'reference_type' => 'SalesOrder',
                        'reference_id' => $salesOrder->id,
                        'reference_number' => $salesOrder->sales_order_number,
                        'created_by' => auth()->id(),
                        'notes' => "Stock reserved for Sales Order {$salesOrder->sales_order_number}",
                    ]);
                }
            }

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
            $stockLevels = ProductStock::with(['product'])
                ->get()
                ->map(function ($stock) {
                    return [
                        'product_id' => $stock->product_id,
                        'product_name' => $stock->product->name,
                        'product_sku' => $stock->product->sku,
                        'quantity' => $stock->quantity,
                        'reserved_quantity' => $stock->reserved_quantity,
                        'available_quantity' => $stock->quantity - $stock->reserved_quantity,
                        'location_code' => $stock->location_code,
                        'warehouse_id' => $stock->warehouse_id,
                        'min_stock_level' => $stock->product->min_stock_level ?? 0,
                        'is_low_stock' => ($stock->quantity - $stock->reserved_quantity) <= ($stock->product->min_stock_level ?? 0),
                    ];
                });

            return response()->json($stockLevels);

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