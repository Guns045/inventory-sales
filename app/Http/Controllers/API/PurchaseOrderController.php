<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $purchaseOrders = PurchaseOrder::with(['supplier', 'user', 'purchaseOrderItems.product'])->paginate(10);
        return response()->json($purchaseOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'order_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,RECEIVED,CLOSED,CANCELLED',
            'notes' => 'nullable|string',
        ]);

        $purchaseOrder = DB::transaction(function () use ($request) {
            $purchaseOrder = PurchaseOrder::create([
                'po_number' => 'PO-' . date('Y-m') . '-' . str_pad(PurchaseOrder::count() + 1, 4, '0', STR_PAD_LEFT),
                'supplier_id' => $request->supplier_id,
                'user_id' => auth()->id(),
                'order_date' => $request->order_date,
                'expected_delivery_date' => $request->expected_delivery_date,
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $request->validate([
                    'items.*.product_id' => 'required|exists:products,id',
                    'items.*.quantity_ordered' => 'required|integer|min:1',
                    'items.*.unit_price' => 'required|numeric|min:0',
                    'items.*.warehouse_id' => 'required|exists:warehouses,id',
                ]);

                $itemTotal = $item['quantity_ordered'] * $item['unit_price'];
                $totalAmount += $itemTotal;

                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'unit_price' => $item['unit_price'],
                    'warehouse_id' => $item['warehouse_id'],
                ]);
            }

            $purchaseOrder->update(['total_amount' => $totalAmount]);

            return $purchaseOrder->refresh();
        });

        return response()->json($purchaseOrder->load(['supplier', 'user', 'purchaseOrderItems.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $purchaseOrder = PurchaseOrder::with(['supplier', 'user', 'purchaseOrderItems.product', 'purchaseOrderItems.warehouse'])->findOrFail($id);
        return response()->json($purchaseOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'order_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,RECEIVED,CLOSED,CANCELLED',
            'notes' => 'nullable|string',
        ]);

        $purchaseOrder = DB::transaction(function () use ($request, $purchaseOrder) {
            $purchaseOrder->update([
                'supplier_id' => $request->supplier_id,
                'order_date' => $request->order_date,
                'expected_delivery_date' => $request->expected_delivery_date,
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            // Update purchase order items
            PurchaseOrderItem::where('purchase_order_id', $purchaseOrder->id)->delete();

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $request->validate([
                    'items.*.product_id' => 'required|exists:products,id',
                    'items.*.quantity_ordered' => 'required|integer|min:1',
                    'items.*.unit_price' => 'required|numeric|min:0',
                    'items.*.warehouse_id' => 'required|exists:warehouses,id',
                ]);

                $itemTotal = $item['quantity_ordered'] * $item['unit_price'];
                $totalAmount += $itemTotal;

                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'unit_price' => $item['unit_price'],
                    'warehouse_id' => $item['warehouse_id'],
                ]);
            }

            $purchaseOrder->update(['total_amount' => $totalAmount]);

            return $purchaseOrder->refresh();
        });

        return response()->json($purchaseOrder->load(['supplier', 'user', 'purchaseOrderItems.product', 'purchaseOrderItems.warehouse']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);
        $purchaseOrder->delete();

        return response()->json(['message' => 'Purchase Order deleted successfully']);
    }

    public function getPurchaseOrderItems($id)
    {
        $purchaseOrder = PurchaseOrder::with('purchaseOrderItems.product')->findOrFail($id);
        return response()->json($purchaseOrder->purchaseOrderItems);
    }

    public function receive($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);
        $purchaseOrder->update(['status' => 'RECEIVED']);
        
        return response()->json($purchaseOrder);
    }
}
