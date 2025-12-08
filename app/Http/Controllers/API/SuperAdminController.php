<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\SalesOrder;
use App\Models\PurchaseOrder;
use App\Models\DeliveryOrder;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Log;

class SuperAdminController extends Controller
{
    public function __construct()
    {
        // Strict check for Root User
        $this->middleware(function ($request, $next) {
            if ($request->user()->email !== 'root@jinantruck.my.id') {
                abort(403, 'Unauthorized. Root access required.');
            }
            return $next($request);
        });
    }

    /**
     * Force update status of any transaction
     */
    public function forceStatus(Request $request)
    {
        $request->validate([
            'type' => 'required|in:sales_order,purchase_order,delivery_order',
            'id' => 'required|integer',
            'status' => 'required|string',
            'reason' => 'required|string'
        ]);

        try {
            DB::beginTransaction();

            $model = null;
            $referenceType = '';

            switch ($request->type) {
                case 'sales_order':
                    $model = SalesOrder::findOrFail($request->id);
                    $referenceType = 'SalesOrder';
                    break;
                case 'purchase_order':
                    $model = PurchaseOrder::findOrFail($request->id);
                    $referenceType = 'PurchaseOrder';
                    break;
                case 'delivery_order':
                    $model = DeliveryOrder::findOrFail($request->id);
                    $referenceType = 'DeliveryOrder';
                    break;
            }

            $oldStatus = $model->status;
            $model->status = $request->status;
            $model->save();

            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'FORCE UPDATE STATUS',
                'description' => "Changed {$referenceType} #{$model->id} status from {$oldStatus} to {$request->status}. Reason: {$request->reason}",
                'reference_type' => $referenceType,
                'reference_id' => $model->id,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Status force updated successfully',
                'data' => $model
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Force Status Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to force update status', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Revert stock for a transaction (Add back to inventory)
     */
    public function revertStock(Request $request)
    {
        $request->validate([
            'type' => 'required|in:sales_order,delivery_order', // PO revert logic is different (deduct)
            'id' => 'required|integer',
            'reason' => 'required|string'
        ]);

        try {
            DB::beginTransaction();

            $items = [];
            $warehouseId = null;
            $referenceType = '';
            $referenceNumber = '';

            if ($request->type === 'sales_order') {
                $order = SalesOrder::with('items')->findOrFail($request->id);
                $items = $order->items;
                $warehouseId = $order->warehouse_id;
                $referenceType = 'SalesOrder';
                $referenceNumber = $order->sales_order_number;
            } elseif ($request->type === 'delivery_order') {
                $order = DeliveryOrder::with('items')->findOrFail($request->id);
                $items = $order->items;
                $warehouseId = $order->warehouse_id;
                $referenceType = 'DeliveryOrder';
                $referenceNumber = $order->delivery_order_number;
            }

            foreach ($items as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)
                    ->where('warehouse_id', $warehouseId)
                    ->first();

                if ($productStock) {
                    $productStock->increment('quantity', $item->quantity);

                    StockMovement::create([
                        'product_id' => $item->product_id,
                        'warehouse_id' => $warehouseId,
                        'type' => 'ADJUSTMENT_IN', // Treat as adjustment
                        'quantity_change' => $item->quantity,
                        'previous_quantity' => $productStock->quantity - $item->quantity,
                        'new_quantity' => $productStock->quantity,
                        'reference_type' => $referenceType,
                        'reference_id' => $request->id,
                        'reference_number' => $referenceNumber,
                        'created_by' => auth()->id(),
                        'notes' => "GOD MODE REVERT: {$request->reason}",
                    ]);
                }
            }

            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'FORCE REVERT STOCK',
                'description' => "Reverted stock for {$referenceType} #{$request->id}. Reason: {$request->reason}",
                'reference_type' => $referenceType,
                'reference_id' => $request->id,
            ]);

            DB::commit();

            return response()->json(['message' => 'Stock reverted successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Revert Stock Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to revert stock', 'error' => $e->getMessage()], 500);
        }
    }
}
