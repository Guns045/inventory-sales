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
use Illuminate\Support\Facades\Log;

class SalesOrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SalesOrder::with(['customer', 'user', 'items.product']);

        // Filter by status if provided
        if ($request->has('status')) {
            $requestedStatus = $request->status;
            Log::info('SalesOrder index: Filtering by status: ' . $requestedStatus);
            $query->where('status', $requestedStatus);
        }

        // Filter by user warehouse access
        $user = $request->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('warehouse_id', $user->warehouse_id);
            });
            Log::info('SalesOrder index: Filtering by warehouse: ' . $user->warehouse_id);
        }

        $salesOrders = $query->paginate(10);

        // Log status distribution for debugging
        $statusCounts = SalesOrder::select('status', \DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->toArray();

        Log::info('SalesOrder index: Status distribution', $statusCounts);
        Log::info('SalesOrder index: Returning ' . $salesOrders->count() . ' orders');

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
        try {
            Log::info('getSalesOrderItems: Fetching items for Sales Order ID: ' . $id);

            $salesOrder = SalesOrder::with('items.product')->findOrFail($id);
            Log::info('getSalesOrderItems: Found Sales Order: ' . $salesOrder->sales_order_number . ' with ' . $salesOrder->items->count() . ' items');

            return response()->json($salesOrder->items);
        } catch (\Exception $e) {
            Log::error('getSalesOrderItems: Error - ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching sales order items: ' . $e->getMessage()
            ], 500);
        }
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

    public function createPickingList(Request $request, $id)
    {
        try {
            Log::info('createPickingList: Starting for Sales Order ID: ' . $id);

            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($id);
            Log::info('createPickingList: Found Sales Order: ' . $salesOrder->sales_order_number . ' with status: ' . $salesOrder->status);

            if ($salesOrder->status !== 'PENDING') {
                Log::warning('createPickingList: Invalid status. Expected: PENDING, Actual: ' . $salesOrder->status);
                return response()->json([
                    'message' => 'Picking List can only be created for PENDING Sales Orders.',
                    'current_status' => $salesOrder->status,
                    'sales_order_number' => $salesOrder->sales_order_number
                ], 422);
            }

            // Check if picking list already exists
            $existingPickingList = \App\Models\PickingList::where('sales_order_id', $id)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->first();

            if ($existingPickingList) {
                return response()->json([
                    'message' => 'Picking List already exists for this Sales Order.',
                    'data' => $existingPickingList
                ], 422);
            }

            DB::beginTransaction();

            $pickingList = \App\Models\PickingList::create([
                'sales_order_id' => $salesOrder->id,
                'user_id' => auth()->id(),
                'status' => 'READY',
                'notes' => $request->notes ?? null,
            ]);
            Log::info('createPickingList: Created Picking List: ' . $pickingList->picking_list_number);

            foreach ($salesOrder->items as $item) {
                Log::info('createPickingList: Processing item: ' . $item->product_id);

                $productStock = \App\Models\ProductStock::where('product_id', $item->product_id)
                    ->first();

                \App\Models\PickingListItem::create([
                    'picking_list_id' => $pickingList->id,
                    'product_id' => $item->product_id,
                    'warehouse_id' => $productStock?->warehouse_id,
                    'location_code' => $productStock?->location_code ?? $item->product->location_code ?? null,
                    'quantity_required' => $item->quantity,
                    'quantity_picked' => 0,
                    'status' => 'PENDING',
                ]);
            }

            $salesOrder->update(['status' => 'PROCESSING']);
            Log::info('createPickingList: Updated Sales Order status to PROCESSING');

            // Create notification for warehouse team (commented out for now to avoid errors)
            // Notification::createForRole(
            //     'Gudang',
            //     "New Picking List {$pickingList->picking_list_number} created for Sales Order {$salesOrder->sales_order_number}",
            //     'info',
            //     '/picking-lists'
            // );

            // Log activity (commented out for now to avoid errors)
            // ActivityLog::log(
            //     'CREATE_PICKING_LIST',
            //     "User created Picking List {$pickingList->picking_list_number} for Sales Order {$salesOrder->sales_order_number}",
            //     $pickingList
            // );

            DB::commit();

            $pickingList->load(['salesOrder.customer', 'items.product', 'user']);

            return response()->json([
                'message' => 'Picking List created successfully!',
                'data' => $pickingList
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('createPickingList: Error - ' . $e->getMessage());
            Log::error('createPickingList: Trace - ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Error creating Picking List: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }
}
