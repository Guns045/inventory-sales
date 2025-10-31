<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\ProductStock;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class DeliveryOrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $deliveryOrders = DeliveryOrder::with(['customer', 'salesOrder', 'deliveryOrderItems.product'])->paginate(10);
        return response()->json($deliveryOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'customer_id' => 'required|exists:customers,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'status' => 'required|in:PREPARING,SHIPPED,DELIVERED',
        ]);

        $deliveryOrder = DB::transaction(function () use ($request) {
            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => 'SJ-' . date('Y-m') . '-' . str_pad(DeliveryOrder::count() + 1, 4, '0', STR_PAD_LEFT),
                'sales_order_id' => $request->sales_order_id,
                'customer_id' => $request->customer_id,
                'shipping_date' => $request->shipping_date,
                'shipping_contact_person' => $request->shipping_contact_person,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->shipping_city,
                'driver_name' => $request->driver_name,
                'vehicle_plate_number' => $request->vehicle_plate_number,
                'status' => $request->status,
            ]);

            // Create delivery order items from the sales order items
            $salesOrder = SalesOrder::findOrFail($request->sales_order_id);
            $salesOrderItems = $salesOrder->salesOrderItems;

            $totalAmount = 0;
            foreach ($salesOrderItems as $item) {
                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'product_id' => $item->product_id,
                    'quantity_shipped' => $item->quantity,
                ]);

                $totalAmount += $item->quantity * $item->unit_price;
            }

            // Update the sales order status to shipped
            $salesOrder->update(['status' => 'SHIPPED']);

            return $deliveryOrder->refresh();
        });

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $deliveryOrder = DeliveryOrder::with(['customer', 'salesOrder', 'deliveryOrderItems.product'])->findOrFail($id);
        return response()->json($deliveryOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $deliveryOrder = DeliveryOrder::findOrFail($id);

        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'customer_id' => 'required|exists:customers,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'status' => 'required|in:PREPARING,SHIPPED,DELIVERED',
        ]);

        $deliveryOrder->update($request->all());

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $deliveryOrder = DeliveryOrder::findOrFail($id);
        $deliveryOrder->delete();

        return response()->json(['message' => 'Delivery Order deleted successfully']);
    }

    public function getDeliveryOrderItems($id)
    {
        $deliveryOrder = DeliveryOrder::with('deliveryOrderItems.product')->findOrFail($id);
        return response()->json($deliveryOrder->deliveryOrderItems);
    }

    /**
     * Create delivery order from picking list
     */
    public function createFromPickingList(Request $request)
    {
        $request->validate([
            'picking_list_id' => 'required|exists:picking_lists,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
        ]);

        $pickingList = PickingList::with(['salesOrder.customer', 'items.product'])->findOrFail($request->picking_list_id);

        if (!$pickingList->canGenerateDeliveryOrder()) {
            return response()->json([
                'message' => 'Cannot generate delivery order. Picking list must be completed and have no existing delivery order.'
            ], 422);
        }

        $deliveryOrder = DB::transaction(function () use ($request, $pickingList) {
            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => DeliveryOrder::generateNumber(),
                'sales_order_id' => $pickingList->sales_order_id,
                'picking_list_id' => $pickingList->id,
                'customer_id' => $pickingList->salesOrder->customer_id,
                'shipping_date' => $request->shipping_date,
                'shipping_contact_person' => $request->shipping_contact_person ?? $pickingList->salesOrder->customer->contact_person,
                'shipping_address' => $request->shipping_address ?? $pickingList->salesOrder->customer->address,
                'shipping_city' => $request->shipping_city ?? $pickingList->salesOrder->customer->city,
                'driver_name' => $request->driver_name,
                'vehicle_plate_number' => $request->vehicle_plate_number,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
            ]);

            // Create delivery order items from picking list items
            foreach ($pickingList->items as $item) {
                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'product_id' => $item->product_id,
                    'quantity_shipped' => $item->quantity_picked,
                    'status' => 'PREPARING',
                    'location_code' => $item->location_code,
                ]);
            }

            // Update the sales order status
            $pickingList->salesOrder->update(['status' => 'SHIPPED']);

            // Log activity
            ActivityLog::log(
                'CREATE_DELIVERY_ORDER_FROM_PICKING',
                'Created delivery order ' . $deliveryOrder->delivery_order_number . ' from picking list ' . $pickingList->picking_list_number,
                $deliveryOrder
            );

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Delivery Order Created',
                'message' => 'Delivery Order ' . $deliveryOrder->delivery_order_number . ' has been created from Picking List ' . $pickingList->picking_list_number,
                'type' => 'success',
                'module' => 'Delivery Order',
                'data_id' => $deliveryOrder->id,
                'read' => false,
            ]);

            return $deliveryOrder;
        });

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'pickingList', 'deliveryOrderItems.product']), 201);
    }

    /**
     * Mark delivery order as shipped
     */
    public function markAsShipped($id)
    {
        $deliveryOrder = DeliveryOrder::findOrFail($id);

        if ($deliveryOrder->status !== 'PREPARING') {
            return response()->json([
                'message' => 'Delivery order cannot be shipped. Current status: ' . $deliveryOrder->status_label
            ], 422);
        }

        $deliveryOrder = DB::transaction(function () use ($deliveryOrder) {
            $deliveryOrder->update([
                'status' => 'SHIPPED',
                'shipping_date' => now(),
            ]);

            // Update all delivery order items status
            $deliveryOrder->deliveryOrderItems()->update(['status' => 'IN_TRANSIT']);

            // Log activity
            ActivityLog::log(
                'MARK_DELIVERY_ORDER_SHIPPED',
                'Marked delivery order ' . $deliveryOrder->delivery_order_number . ' as shipped',
                $deliveryOrder
            );

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Delivery Order Shipped',
                'message' => 'Delivery Order ' . $deliveryOrder->delivery_order_number . ' has been shipped',
                'type' => 'info',
                'module' => 'Delivery Order',
                'data_id' => $deliveryOrder->id,
                'read' => false,
            ]);

            return $deliveryOrder;
        });

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'pickingList', 'deliveryOrderItems.product']));
    }

    /**
     * Mark delivery order as delivered
     */
    public function markAsDelivered(Request $request, $id)
    {
        $deliveryOrder = DeliveryOrder::findOrFail($id);

        if (!$deliveryOrder->canBeDelivered()) {
            return response()->json([
                'message' => 'Delivery order cannot be marked as delivered. Current status: ' . $deliveryOrder->status_label
            ], 422);
        }

        $request->validate([
            'delivery_items' => 'required|array',
            'delivery_items.*.delivery_order_item_id' => 'required|exists:delivery_order_items,id',
            'delivery_items.*.quantity_delivered' => 'required|integer|min:0',
            'delivery_items.*.status' => 'required|in:DELIVERED,PARTIAL,DAMAGED',
            'delivery_items.*.notes' => 'nullable|string',
        ]);

        $deliveryOrder = DB::transaction(function () use ($request, $deliveryOrder) {
            $allDelivered = true;

            foreach ($request->delivery_items as $deliveryItem) {
                $deliveryOrderItem = DeliveryOrderItem::findOrFail($deliveryItem['delivery_order_item_id']);

                if ($deliveryItem['status'] === 'DELIVERED') {
                    $deliveryOrderItem->update([
                        'quantity_delivered' => $deliveryItem['quantity_delivered'],
                        'status' => 'DELIVERED',
                        'delivered_at' => now(),
                        'notes' => $deliveryItem['notes'] ?? null,
                    ]);
                } elseif ($deliveryItem['status'] === 'PARTIAL') {
                    $deliveryOrderItem->update([
                        'quantity_delivered' => $deliveryItem['quantity_delivered'],
                        'status' => 'PARTIAL',
                        'notes' => $deliveryItem['notes'] ?? null,
                    ]);
                    $allDelivered = false;
                } elseif ($deliveryItem['status'] === 'DAMAGED') {
                    $deliveryOrderItem->update([
                        'status' => 'DAMAGED',
                        'notes' => $deliveryItem['notes'] ?? null,
                    ]);
                    $allDelivered = false;
                }
            }

            // Update delivery order status
            if ($allDelivered) {
                $deliveryOrder->update([
                    'status' => 'DELIVERED',
                    'delivered_at' => now(),
                ]);

                // Update sales order status to completed
                if ($deliveryOrder->salesOrder) {
                    $deliveryOrder->salesOrder->update(['status' => 'COMPLETED']);
                }
            }

            // Log activity
            ActivityLog::log(
                'MARK_DELIVERY_ORDER_DELIVERED',
                'Marked delivery order ' . $deliveryOrder->delivery_order_number . ' items as delivered',
                $deliveryOrder
            );

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Delivery Order Delivered',
                'message' => 'Items from Delivery Order ' . $deliveryOrder->delivery_order_number . ' have been delivered',
                'type' => 'success',
                'module' => 'Delivery Order',
                'data_id' => $deliveryOrder->id,
                'read' => false,
            ]);

            return $deliveryOrder;
        });

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'pickingList', 'deliveryOrderItems.product']));
    }

    /**
     * Print delivery order
     */
    public function print($id)
    {
        $deliveryOrder = DeliveryOrder::with([
            'customer',
            'salesOrder',
            'pickingList',
            'deliveryOrderItems.product',
            'createdBy'
        ])->findOrFail($id);

        $pdf = PDF::loadView('pdf.delivery-order', compact('deliveryOrder'));

        return $pdf->stream('delivery-order-' . $deliveryOrder->delivery_order_number . '.pdf');
    }

    /**
     * Create delivery order from sales order (for warehouse workflow)
     */
    public function createFromSalesOrder(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'kurir' => 'nullable|string|max:255',
        ]);

        $salesOrder = SalesOrder::with(['customer', 'items.product'])->findOrFail($request->sales_order_id);

        if ($salesOrder->status !== 'READY_TO_SHIP') {
            return response()->json([
                'message' => 'Cannot generate delivery order. Sales order must be in READY_TO_SHIP status.'
            ], 422);
        }

        // Check if delivery order already exists for this sales order
        $existingDeliveryOrder = DeliveryOrder::where('sales_order_id', $request->sales_order_id)->first();
        if ($existingDeliveryOrder) {
            return response()->json([
                'message' => 'Delivery Order already exists for this Sales Order.',
                'data' => $existingDeliveryOrder
            ], 422);
        }

        $deliveryOrder = DB::transaction(function () use ($request, $salesOrder) {
            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => DeliveryOrder::generateNumber(),
                'sales_order_id' => $salesOrder->id,
                'customer_id' => $salesOrder->customer_id,
                'shipping_date' => $request->shipping_date,
                'shipping_contact_person' => $request->shipping_contact_person ?? $salesOrder->customer->contact_person,
                'shipping_address' => $request->shipping_address ?? $salesOrder->customer->address,
                'shipping_city' => $request->shipping_city ?? $salesOrder->customer->city,
                'driver_name' => $request->driver_name,
                'vehicle_plate_number' => $request->vehicle_plate_number,
                'notes' => $request->kurir ? 'Kurir: ' . $request->kurir : null,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
            ]);

            // Create delivery order items from sales order items
            foreach ($salesOrder->items as $item) {
                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'product_id' => $item->product_id,
                    'quantity_shipped' => $item->quantity,
                    'status' => 'PREPARING',
                    'location_code' => $item->product->location_code ?? null,
                ]);
            }

            // Update the sales order status
            $salesOrder->update(['status' => 'SHIPPED']);

            // Log activity
            ActivityLog::log(
                'CREATE_DELIVERY_ORDER',
                'Created delivery order ' . $deliveryOrder->delivery_order_number . ' from sales order ' . $salesOrder->sales_order_number,
                $deliveryOrder
            );

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Delivery Order Created',
                'message' => 'Delivery Order ' . $deliveryOrder->delivery_order_number . ' has been created from Sales Order ' . $salesOrder->sales_order_number,
                'type' => 'success',
                'module' => 'Delivery Order',
                'data_id' => $deliveryOrder->id,
                'read' => false,
            ]);

            return $deliveryOrder;
        });

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']), 201);
    }

    /**
     * Get delivery orders that can be generated from picking lists
     */
    public function getAvailablePickingLists()
    {
        $availablePickingLists = PickingList::with(['salesOrder.customer', 'items.product'])
            ->where('status', 'COMPLETED')
            ->whereDoesntHave('deliveryOrders')
            ->orderBy('completed_at', 'desc')
            ->get();

        return response()->json($availablePickingLists);
    }
}
