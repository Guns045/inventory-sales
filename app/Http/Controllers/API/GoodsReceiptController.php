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
use Illuminate\Support\Facades\DB;

class GoodsReceiptController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $goodsReceipts = GoodsReceipt::with(['purchaseOrder', 'user'])->paginate(10);
        return response()->json($goodsReceipts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'receipt_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $goodsReceipt = DB::transaction(function () use ($request) {
            $goodsReceipt = GoodsReceipt::create([
                'receipt_number' => 'GR-' . date('Y-m') . '-' . str_pad(GoodsReceipt::count() + 1, 4, '0', STR_PAD_LEFT),
                'purchase_order_id' => $request->purchase_order_id,
                'user_id' => auth()->id(),
                'receipt_date' => $request->receipt_date,
                'notes' => $request->notes,
            ]);

            $purchaseOrder = PurchaseOrder::findOrFail($request->purchase_order_id);
            $purchaseOrderItems = $purchaseOrder->purchaseOrderItems;

            foreach ($purchaseOrderItems as $purchaseOrderItem) {
                // Create goods receipt item
                $goodsReceiptItem = GoodsReceiptItem::create([
                    'goods_receipt_id' => $goodsReceipt->id,
                    'purchase_order_item_id' => $purchaseOrderItem->id,
                    'quantity_received' => $purchaseOrderItem->quantity_ordered, // Assuming we receive all ordered items
                    'condition' => 'GOOD',
                ]);

                // Update the quantity received in purchase order item
                $purchaseOrderItem->update([
                    'quantity_received' => $purchaseOrderItem->quantity_received + $goodsReceiptItem->quantity_received,
                ]);

                // Update product stock
                $productStock = ProductStock::firstOrCreate(
                    [
                        'product_id' => $purchaseOrderItem->product_id,
                        'warehouse_id' => $purchaseOrderItem->warehouse_id,
                    ],
                    [
                        'quantity' => 0,
                        'reserved_quantity' => 0,
                    ]
                );

                $productStock->increment('quantity', $goodsReceiptItem->quantity_received);

                // Create stock movement record
                StockMovement::create([
                    'product_id' => $purchaseOrderItem->product_id,
                    'warehouse_id' => $purchaseOrderItem->warehouse_id,
                    'type' => 'IN',
                    'quantity_change' => $goodsReceiptItem->quantity_received,
                    'reference_type' => 'App\Models\GoodsReceipt',
                    'reference_id' => $goodsReceipt->id,
                ]);
            }

            // Update purchase order status
            $purchaseOrder->update(['status' => 'RECEIVED']);

            return $goodsReceipt->refresh();
        });

        return response()->json($goodsReceipt->load(['purchaseOrder', 'user']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $goodsReceipt = GoodsReceipt::with(['purchaseOrder', 'user', 'goodsReceiptItems.purchaseOrderItem.product'])->findOrFail($id);
        return response()->json($goodsReceipt);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);

        $request->validate([
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'receipt_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $goodsReceipt->update($request->all());

        return response()->json($goodsReceipt->load(['purchaseOrder', 'user', 'goodsReceiptItems.purchaseOrderItem.product']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);
        $goodsReceipt->delete();

        return response()->json(['message' => 'Goods Receipt deleted successfully']);
    }

    public function getGoodsReceiptItems($id)
    {
        $goodsReceipt = GoodsReceipt::with('goodsReceiptItems.purchaseOrderItem.product')->findOrFail($id);
        return response()->json($goodsReceipt->goodsReceiptItems);
    }
}
