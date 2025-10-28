<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Quotation;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;

class SalesOrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $salesOrders = SalesOrder::with(['customer', 'user', 'salesOrderItems.product'])->paginate(10);
        return response()->json($salesOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'quotation_id' => 'nullable|exists:quotations,id',
            'customer_id' => 'required|exists:customers,id',
            'status' => 'required|in:PENDING,PROCESSING,READY_TO_SHIP,SHIPPED,COMPLETED,CANCELLED',
            'notes' => 'nullable|string',
        ]);

        // Validate quotation if provided
        if ($request->quotation_id) {
            $quotation = Quotation::findOrFail($request->quotation_id);
            if ($quotation->status !== 'APPROVED') {
                return response()->json([
                    'message' => 'Only approved quotations can be converted to Sales Order'
                ], 422);
            }
        }

        $salesOrder = DB::transaction(function () use ($request) {
            $quotation = null;

            // Create the sales order
            $salesOrder = SalesOrder::create([
                'sales_order_number' => 'SO-' . date('Y-m') . '-' . str_pad(SalesOrder::count() + 1, 4, '0', STR_PAD_LEFT),
                'quotation_id' => $request->quotation_id,
                'customer_id' => $request->customer_id,
                'user_id' => auth()->id(),
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            // Create sales order items from quotation items if quotation_id is provided
            if ($request->quotation_id) {
                $quotation = Quotation::findOrFail($request->quotation_id);
                $quotationItems = $quotation->quotationItems;

                foreach ($quotationItems as $item) {
                    SalesOrderItem::create([
                        'sales_order_id' => $salesOrder->id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'discount_percentage' => $item->discount_percentage,
                        'tax_rate' => $item->tax_rate,
                    ]);
                }
            } else {
                // Create sales order items from request items
                foreach ($request->items as $item) {
                    $request->validate([
                        'items.*.product_id' => 'required|exists:products,id',
                        'items.*.quantity' => 'required|integer|min:1',
                        'items.*.unit_price' => 'required|numeric|min:0',
                        'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
                        'items.*.tax_rate' => 'required|numeric|min:0',
                    ]);

                    SalesOrderItem::create([
                        'sales_order_id' => $salesOrder->id,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'discount_percentage' => $item['discount_percentage'],
                        'tax_rate' => $item['tax_rate'],
                    ]);
                }
            }

            return [$salesOrder, $quotation];
        });

        [$salesOrder, $quotation] = $salesOrder;

        // Log activity
        $description = $request->quotation_id
            ? "User converted quotation {$quotation->quotation_number} to Sales Order {$salesOrder->sales_order_number}"
            : "User created Sales Order {$salesOrder->sales_order_number} for {$salesOrder->customer->company_name}";

        ActivityLog::log(
            'CREATE_SALES_ORDER',
            $description,
            $salesOrder
        );

        // Create notifications
        if ($request->quotation_id) {
            // Notify warehouse staff about new SO
            Notification::createForRole(
                'Gudang',
                "New Sales Order created: {$salesOrder->sales_order_number} (from quotation)",
                'info',
                '/sales-orders'
            );
        }

        // Notify admin
        Notification::createForRole(
            'Admin',
            "New Sales Order created: {$salesOrder->sales_order_number}",
            'info',
            '/sales-orders'
        );

        return response()->json($salesOrder->load(['customer', 'user', 'salesOrderItems.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $salesOrder = SalesOrder::with(['customer', 'user', 'salesOrderItems.product'])->findOrFail($id);
        return response()->json($salesOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $salesOrder = SalesOrder::findOrFail($id);

        $request->validate([
            'quotation_id' => 'nullable|exists:quotations,id',
            'customer_id' => 'required|exists:customers,id',
            'status' => 'required|in:PENDING,PROCESSING,READY_TO_SHIP,SHIPPED,COMPLETED,CANCELLED',
            'notes' => 'nullable|string',
        ]);

        $salesOrder = DB::transaction(function () use ($request, $salesOrder) {
            $salesOrder->update([
                'quotation_id' => $request->quotation_id,
                'customer_id' => $request->customer_id,
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            // Update sales order items
            SalesOrderItem::where('sales_order_id', $salesOrder->id)->delete();

            foreach ($request->items as $item) {
                $request->validate([
                    'items.*.product_id' => 'required|exists:products,id',
                    'items.*.quantity' => 'required|integer|min:1',
                    'items.*.unit_price' => 'required|numeric|min:0',
                    'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
                    'items.*.tax_rate' => 'required|numeric|min:0',
                ]);

                SalesOrderItem::create([
                    'sales_order_id' => $salesOrder->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'],
                    'tax_rate' => $item['tax_rate'],
                ]);
            }

            return $salesOrder->refresh();
        });

        return response()->json($salesOrder->load(['customer', 'user', 'salesOrderItems.product']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $salesOrder = SalesOrder::findOrFail($id);
        $salesOrder->delete();

        return response()->json(['message' => 'Sales Order deleted successfully']);
    }

    public function getSalesOrderItems($id)
    {
        $salesOrder = SalesOrder::with('salesOrderItems.product')->findOrFail($id);
        return response()->json($salesOrder->salesOrderItems);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:PENDING,PROCESSING,READY_TO_SHIP,SHIPPED,COMPLETED,CANCELLED',
        ]);

        $salesOrder = SalesOrder::findOrFail($id);
        $oldStatus = $salesOrder->status;
        $salesOrder->update(['status' => $request->status]);

        // Log activity
        ActivityLog::log(
            'UPDATE_SALES_ORDER_STATUS',
            "User updated Sales Order {$salesOrder->sales_order_number} status from {$oldStatus} to {$request->status}",
            $salesOrder,
            ['status' => $oldStatus],
            ['status' => $request->status]
        );

        // Create notifications based on status
        if ($request->status === 'READY_TO_SHIP') {
            Notification::createForRole(
                'Gudang',
                "Sales Order {$salesOrder->sales_order_number} is ready to ship",
                'info',
                '/sales-orders'
            );
        } elseif ($request->status === 'SHIPPED') {
            Notification::createForRole(
                'Finance',
                "Sales Order {$salesOrder->sales_order_number} has been shipped. Ready for invoicing.",
                'info',
                '/sales-orders'
            );
        } elseif ($request->status === 'COMPLETED') {
            Notification::createForRole(
                'Finance',
                "Sales Order {$salesOrder->sales_order_number} completed. Please ensure invoice is created.",
                'success',
                '/sales-orders'
            );
        }

        return response()->json($salesOrder);
    }
}
