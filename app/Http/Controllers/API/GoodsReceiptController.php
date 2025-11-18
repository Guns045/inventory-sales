<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\DocumentCounter;
use App\Traits\DocumentNumberHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GoodsReceiptController extends Controller
{
    use DocumentNumberHelper;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = GoodsReceipt::with(['purchaseOrder.supplier', 'warehouse', 'receivedBy', 'items.product']);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'like', "%{$search}%")
                  ->orWhereHas('purchaseOrder', function ($pq) use ($search) {
                      $pq->where('po_number', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by user warehouse access
        $user = $request->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->where('warehouse_id', $user->warehouse_id);
        }

        // Date range filtering
        if ($request->has('date_from')) {
            $query->whereDate('received_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('received_date', '<=', $request->date_to);
        }

        $goodsReceipts = $query->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($goodsReceipts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'received_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_ordered' => 'required|integer|min:1',
            'items.*.quantity_received' => 'required|integer|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.condition' => 'required|in:GOOD,DAMAGED,DEFECTIVE,WRONG_ITEM',
            'items.*.batch_number' => 'nullable|string',
            'items.*.expiry_date' => 'nullable|date',
        ]);

        $goodsReceipt = DB::transaction(function () use ($request) {
            // Generate GR number using DocumentCounter
            $grNumber = DocumentCounter::getNextNumber('GOODS_RECEIPT', $request->warehouse_id);

            $goodsReceipt = GoodsReceipt::create([
                'receipt_number' => $grNumber,
                'purchase_order_id' => $request->purchase_order_id,
                'warehouse_id' => $request->warehouse_id,
                'user_id' => auth()->id() ?? 1,
                'received_by' => auth()->id() ?? 1,
                'status' => 'PENDING',
                'receipt_date' => $request->received_date,
                'notes' => $request->notes,
            ]);

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $lineTotal = $item['quantity_received'] * $item['unit_price'];
                $totalAmount += $lineTotal;

                GoodsReceiptItem::create([
                    'goods_receipt_id' => $goodsReceipt->id,
                    'purchase_order_item_id' => $item['purchase_order_item_id'],
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => $item['quantity_received'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $lineTotal,
                    'condition' => $item['condition'],
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'notes' => null,
                ]);
            }

            $goodsReceipt->update(['total_amount' => $totalAmount]);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id() ?? 1,
                'action' => 'Created Goods Receipt',
                'description' => "Created GR {$grNumber} for PO {$goodsReceipt->purchaseOrder->po_number}",
                'reference_type' => 'GoodsReceipt',
                'reference_id' => $goodsReceipt->id,
            ]);

            return $goodsReceipt->refresh();
        });

        return response()->json($goodsReceipt->load(['purchaseOrder.supplier', 'warehouse', 'receivedBy', 'items.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $goodsReceipt = GoodsReceipt::with([
            'purchaseOrder.supplier',
            'warehouse',
            'receivedBy',
            'items.product',
            'items.purchaseOrderItem'
        ])->findOrFail($id);

        // Check warehouse access for non-super admins
        $user = request()->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id != $goodsReceipt->warehouse_id) {
            return response()->json(['message' => 'Unauthorized access to this goods receipt'], 403);
        }

        return response()->json($goodsReceipt);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);

        // Check if GR can be edited (only PENDING status)
        if ($goodsReceipt->status !== 'PENDING') {
            return response()->json(['message' => 'Only pending goods receipts can be edited'], 422);
        }

        $request->validate([
            'received_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_ordered' => 'required|integer|min:1',
            'items.*.quantity_received' => 'required|integer|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.condition' => 'required|in:GOOD,DAMAGED,DEFECTIVE,WRONG_ITEM',
            'items.*.batch_number' => 'nullable|string',
            'items.*.expiry_date' => 'nullable|date',
        ]);

        $goodsReceipt = DB::transaction(function () use ($request, $goodsReceipt) {
            $goodsReceipt->update([
                'received_date' => $request->received_date,
                'notes' => $request->notes,
            ]);

            // Update goods receipt items
            GoodsReceiptItem::where('goods_receipt_id', $goodsReceipt->id)->delete();

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $lineTotal = $item['quantity_received'] * $item['unit_price'];
                $totalAmount += $lineTotal;

                GoodsReceiptItem::create([
                    'goods_receipt_id' => $goodsReceipt->id,
                    'purchase_order_item_id' => $item['purchase_order_item_id'],
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => $item['quantity_received'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $lineTotal,
                    'condition' => $item['condition'],
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'notes' => null,
                ]);
            }

            $goodsReceipt->update(['total_amount' => $totalAmount]);

            return $goodsReceipt->refresh();
        });

        return response()->json($goodsReceipt->load(['purchaseOrder.supplier', 'warehouse', 'receivedBy', 'items.product']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);

        // Check if GR can be deleted (only PENDING status)
        if ($goodsReceipt->status !== 'PENDING') {
            return response()->json(['message' => 'Only pending goods receipts can be deleted'], 422);
        }

        DB::transaction(function () use ($goodsReceipt) {
            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Deleted Goods Receipt',
                'reference_type' => 'GoodsReceipt',
                'reference_id' => $goodsReceipt->id,
                'details' => "Deleted GR {$goodsReceipt->receipt_number}",
            ]);

            $goodsReceipt->delete();
        });

        return response()->json(['message' => 'Goods Receipt deleted successfully']);
    }

    /**
     * Process goods receipt (receive items and update stock)
     */
    public function receive(Request $request, $id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);

        // Check if GR can be received
        if ($goodsReceipt->status !== 'PENDING') {
            return response()->json(['message' => 'Only pending goods receipts can be received'], 422);
        }

        $request->validate([
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $goodsReceipt) {
            $goodsReceipt->processReceipt();

            // Create notification only if we have a valid user
            $userId = auth()->id() ?? $goodsReceipt->received_by;
            if ($userId) {
                Notification::create([
                    'user_id' => $userId,
                    'title' => 'Goods Receipt Processed',
                    'message' => "GR {$goodsReceipt->receipt_number} has been processed. Status: {$goodsReceipt->status}",
                    'type' => 'goods_receipt',
                    'reference_id' => $goodsReceipt->id,
                ]);
            }

            return $goodsReceipt;
        });

        return response()->json($goodsReceipt->load(['purchaseOrder.supplier', 'warehouse', 'receivedBy', 'items.product']));
    }

    /**
     * Get goods receipts by status
     */
    public function getByStatus($status)
    {
        $query = GoodsReceipt::with(['purchaseOrder.supplier', 'warehouse', 'items.product'])
            ->where('status', $status);

        // Filter by user warehouse access
        $user = request()->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->where('warehouse_id', $user->warehouse_id);
        }

        $goodsReceipts = $query->orderBy('created_at', 'desc')->get();
        return response()->json($goodsReceipts);
    }

    /**
     * Get goods receipt items
     */
    public function getGoodsReceiptItems($id)
    {
        $goodsReceipt = GoodsReceipt::with(['items.product', 'items.purchaseOrderItem'])->findOrFail($id);
        return response()->json($goodsReceipt->items);
    }
}
