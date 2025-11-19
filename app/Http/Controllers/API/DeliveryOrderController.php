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
use App\Models\DocumentCounter;
use App\Traits\DocumentNumberHelper;
use App\Transformers\DeliveryOrderTransformer;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class DeliveryOrderController extends Controller
{
    use DocumentNumberHelper;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = DeliveryOrder::with(['customer', 'salesOrder', 'deliveryOrderItems.product'])
            ->orderBy('created_at', 'desc');

        // Filter by source_type if provided
        if ($request->has('source_type')) {
            $query->where('source_type', $request->source_type);
        }

        $deliveryOrders = $query->paginate(10);
        return response()->json($deliveryOrders);
    }

    /**
     * Get ready to create delivery orders (SO yang sudah SHIPPED tapi belum ada DO)
     */
    public function readyToCreate()
    {
        // Get SO yang statusnya SHIPPED dan belum ada DO-nya
        $shippedSalesOrders = SalesOrder::with(['customer', 'salesOrderItems.product', 'user'])
            ->where('status', 'SHIPPED')
            ->whereDoesntHave('deliveryOrder') // Belum ada delivery order
            ->orderBy('updated_at', 'desc')
            ->paginate(10);

        return response()->json($shippedSalesOrders);
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
            // Get warehouse_id from sales order (inherit from SO)
            $salesOrder = SalesOrder::findOrFail($request->sales_order_id);
            $warehouseId = $salesOrder->warehouse_id;

            // Calculate total amount first
            $salesOrderItems = $salesOrder->salesOrderItems;
            $totalAmount = 0;
            foreach ($salesOrderItems as $item) {
                $totalAmount += $item->quantity * $item->unit_price;
            }

            // Generate delivery order number manually
            $deliveryOrderNumber = DocumentCounter::getNextNumber('DELIVERY_ORDER', $warehouseId);

            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => $deliveryOrderNumber,
                'sales_order_id' => $request->sales_order_id,
                'customer_id' => $request->customer_id,
                'warehouse_id' => $warehouseId,
                'shipping_date' => $request->shipping_date,
                'shipping_contact_person' => $request->shipping_contact_person,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->shipping_city,
                'driver_name' => $request->driver_name,
                'vehicle_plate_number' => $request->vehicle_plate_number,
                'status' => $request->status,
                'total_amount' => $totalAmount,
            ]);

            // Create delivery order items from the sales order items
            foreach ($salesOrderItems as $item) {
                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'product_id' => $item->product_id,
                    'quantity_shipped' => $item->quantity,
                ]);
            }

            // Update the sales order status to PREPARING (sync with DO status)
            $salesOrder->update(['status' => 'PREPARING']);

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
     * Update delivery order status
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:PREPARING,READY_TO_SHIP,SHIPPED,DELIVERED,CANCELLED',
        ]);

        $deliveryOrder = DeliveryOrder::findOrFail($id);
        $oldStatus = $deliveryOrder->status;

        $deliveryOrder = DB::transaction(function () use ($request, $deliveryOrder, $oldStatus) {
            $deliveryOrder->update(['status' => $request->status]);

            // Update related sales order status based on delivery order status change
            if ($deliveryOrder->salesOrder) {
                $salesOrder = $deliveryOrder->salesOrder;

                // If DO status changes to READY_TO_SHIP, update SO to READY_TO_SHIP
                if ($oldStatus !== 'READY_TO_SHIP' && $request->status === 'READY_TO_SHIP') {
                    $salesOrder->update(['status' => 'READY_TO_SHIP']);
                }

                // If DO status changes to SHIPPED, update SO to SHIPPED
                if ($oldStatus !== 'SHIPPED' && $request->status === 'SHIPPED') {
                    $salesOrder->update(['status' => 'SHIPPED']);
                    $deliveryOrder->update(['shipping_date' => now()]);
                    $deliveryOrder->deliveryOrderItems()->update(['status' => 'IN_TRANSIT']);
                }
            }

            // If status is being updated to DELIVERED, set delivered date
            if ($oldStatus !== 'DELIVERED' && $request->status === 'DELIVERED') {
                $deliveryOrder->update(['delivered_at' => now()]);
                $deliveryOrder->deliveryOrderItems()->update(['status' => 'DELIVERED']);

                // Update related sales order status to COMPLETED
                if ($deliveryOrder->salesOrder) {
                    $deliveryOrder->salesOrder->update(['status' => 'COMPLETED']);
                }
            }

            // Log activity
            ActivityLog::log(
                'UPDATE_DELIVERY_ORDER_STATUS',
                "User updated Delivery Order {$deliveryOrder->delivery_order_number} status from {$oldStatus} to {$request->status}",
                $deliveryOrder,
                ['status' => $oldStatus],
                ['status' => $request->status]
            );

            return $deliveryOrder->refresh();
        });

        // Create notifications based on status
        if ($request->status === 'READY_TO_SHIP') {
            Notification::createForRole(
                'Gudang',
                "Delivery Order {$deliveryOrder->delivery_order_number} is ready to ship",
                'info',
                '/delivery-orders'
            );
        } elseif ($request->status === 'SHIPPED') {
            Notification::createForRole(
                'Finance',
                "Delivery Order {$deliveryOrder->delivery_order_number} has been shipped. Ready for invoicing.",
                'info',
                '/delivery-orders'
            );
        } elseif ($request->status === 'DELIVERED') {
            Notification::createForRole(
                'Finance',
                "Delivery Order {$deliveryOrder->delivery_order_number} delivered. Please ensure invoice is created.",
                'success',
                '/delivery-orders'
            );
        }

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
            // Calculate total amount from sales order items
            $totalAmount = 0;
            $salesOrderItems = $pickingList->salesOrder->salesOrderItems()->get();
            $itemPrices = [];

            foreach ($salesOrderItems as $soItem) {
                $itemPrices[$soItem->product_id] = $soItem->unit_price;
            }

            // Create delivery order items from picking list items
            foreach ($pickingList->items as $item) {
                $unitPrice = $itemPrices[$item->product_id] ?? 0;
                $totalAmount += $item->quantity_picked * $unitPrice;
            }

            // Generate delivery order number manually
            $deliveryOrderNumber = DocumentCounter::getNextNumber('DELIVERY_ORDER', $pickingList->warehouse_id);

            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => $deliveryOrderNumber,
                'sales_order_id' => $pickingList->sales_order_id,
                'picking_list_id' => $pickingList->id,
                'customer_id' => $pickingList->salesOrder->customer_id,
                'warehouse_id' => $pickingList->warehouse_id, // Inherit from PickingList
                'shipping_date' => $request->shipping_date,
                'shipping_contact_person' => $request->shipping_contact_person ?? $pickingList->salesOrder->customer->contact_person,
                'shipping_address' => $request->shipping_address ?? $pickingList->salesOrder->customer->address,
                'shipping_city' => $request->shipping_city ?? $pickingList->salesOrder->customer->city,
                'driver_name' => $request->driver_name,
                'vehicle_plate_number' => $request->vehicle_plate_number,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
                'total_amount' => $totalAmount,
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

            // Update the sales order status to PREPARING (sync with DO status)
            $pickingList->salesOrder->update(['status' => 'PREPARING']);

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

            // Update related sales order status to SHIPPED
            if ($deliveryOrder->salesOrder) {
                $deliveryOrder->salesOrder->update(['status' => 'SHIPPED']);
            }

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
            'recipient_name' => 'nullable|string|max:255',
            'recipient_title' => 'nullable|string|max:255',
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
                    'recipient_name' => $request->recipient_name,
                    'recipient_title' => $request->recipient_title,
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
     * Print delivery order dengan template lama
     */
    public function printOld($id)
    {
        $deliveryOrder = DeliveryOrder::with([
            'customer',
            'salesOrder',
            'pickingList',
            'deliveryOrderItems.product',
            'createdBy'
        ])->findOrFail($id);

        // Check if the delivery order has items, if not create from sales order
        if ($deliveryOrder->deliveryOrderItems->isEmpty() && $deliveryOrder->salesOrder) {
            $deliveryOrder->items = $deliveryOrder->salesOrder->salesOrderItems;
        } else {
            $deliveryOrder->items = $deliveryOrder->deliveryOrderItems;
        }

        $pdf = PDF::loadView('pdf.delivery-order', compact('deliveryOrder'));

        // Safe filename - replace invalid characters
        $safeNumber = str_replace(['/', '\\'], '_', $deliveryOrder->delivery_order_number);
        return $pdf->stream('delivery-order-' . $safeNumber . '.pdf');
    }

    /**
     * Print delivery order dengan template baru
     */
    public function print($id)
    {
        // Load delivery order dengan relationships
        $deliveryOrder = DeliveryOrder::with([
            'customer',
            'salesOrder',
            'deliveryOrderItems.product',
            'salesOrder.salesOrderItems.product',
            'createdBy'
        ])->findOrFail($id);

        // Check if IT delivery order and load warehouse transfer data
        if ($deliveryOrder->source_type === 'IT' && $deliveryOrder->source_id) {
            $transfer = \App\Models\WarehouseTransfer::with(['product', 'warehouseFrom', 'warehouseTo'])
                ->findOrFail($deliveryOrder->source_id);

            // Use IT transformer
            $deliveryData = DeliveryOrderTransformer::transformFromWarehouseTransfer($transfer);
            $sourceType = 'IT';
        } else {
            // Check if delivery order has items, if not create from sales order
            if ($deliveryOrder->deliveryOrderItems->isEmpty() && $deliveryOrder->salesOrder) {
                // Transform delivery order with sales order items as fallback
                $deliveryData = DeliveryOrderTransformer::transform($deliveryOrder);

                // Replace empty items with sales order items
                $salesOrderItems = [];
                foreach ($deliveryOrder->salesOrder->salesOrderItems as $soItem) {
                    $salesOrderItems[] = [
                        'part_number' => $soItem->product->sku ?? $soItem->product_code ?? 'N/A',
                        'description' => $soItem->product->description ?? $soItem->description ?? 'No description',
                        'quantity' => $soItem->quantity,
                        'po_number' => 'N/A',
                        'delivery_method' => 'Truck',
                        'delivery_vendor' => 'Internal'
                    ];
                }

                // Override items in delivery data
                $deliveryData['items'] = $salesOrderItems;
            } else {
                // Use SO transformer normal
                $deliveryData = DeliveryOrderTransformer::transform($deliveryOrder);
            }
            $sourceType = 'SO';
        }

        $companyData = DeliveryOrderTransformer::getCompanyData();

        // Log activity
        ActivityLog::log(
            'PRINT_DELIVERY_ORDER_PDF',
            "User printed delivery order {$deliveryOrder->delivery_order_number}",
            $deliveryOrder
        );

        // Generate PDF dengan universal template
        $pdf = PDF::loadView('pdf.delivery-order-universal', [
            'company' => $companyData,
            'delivery' => $deliveryData,
            'source_type' => $sourceType
        ])->setPaper('a4', 'portrait');

        // Safe filename
        $safeNumber = str_replace(['/', '\\'], '_', $deliveryOrder->delivery_order_number);
        return $pdf->stream("delivery-order-{$safeNumber}.pdf");
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
            // Calculate total amount from sales order items
            $totalAmount = 0;
            foreach ($salesOrder->items as $item) {
                $totalAmount += $item->quantity * $item->unit_price;
            }

            // Generate delivery order number manually
            $deliveryOrderNumber = DocumentCounter::getNextNumber('DELIVERY_ORDER', $salesOrder->warehouse_id);

            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => $deliveryOrderNumber,
                'sales_order_id' => $salesOrder->id,
                'customer_id' => $salesOrder->customer_id,
                'warehouse_id' => $salesOrder->warehouse_id, // Inherit from Sales Order
                'shipping_date' => $request->shipping_date,
                'shipping_contact_person' => $request->shipping_contact_person ?? $salesOrder->customer->contact_person,
                'shipping_address' => $request->shipping_address ?? $salesOrder->customer->address,
                'shipping_city' => $request->shipping_city ?? $salesOrder->customer->city,
                'driver_name' => $request->driver_name,
                'vehicle_plate_number' => $request->vehicle_plate_number,
                'notes' => $request->kurir ? 'Kurir: ' . $request->kurir : null,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
                'total_amount' => $totalAmount,
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

            // Update the sales order status to PREPARING (sync with DO status)
            $salesOrder->update(['status' => 'PREPARING']);

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

    /**
     * Get warehouse code based on user role for delivery orders (default to JKT)
     *
     * @param User $user
     * @return string
     */
    private function getUserWarehouseCodeForDelivery($user)
    {
        // Check if user has a specific warehouse role
        if ($user->role && $user->role->name === 'Gudang JKT') {
            return 'JKT';
        } elseif ($user->role && $user->role->name === 'Gudang MKS') {
            return 'MKS';
        } elseif ($user->role && $user->role->name === 'Admin') {
            return 'JKT'; // Default to JKT for Admin
        }

        // Default to JKT for other roles
        return 'JKT';
    }

    /**
     * Create delivery order from warehouse transfer
     */
    public function createFromTransfer(Request $request)
    {
        $validated = $request->validate([
            'warehouse_transfer_id' => 'required|exists:warehouse_transfers,id'
        ]);

        try {
            $transfer = \App\Models\WarehouseTransfer::with(['product', 'warehouseFrom', 'warehouseTo'])
                ->findOrFail($validated['warehouse_transfer_id']);

            if ($transfer->status !== 'IN_TRANSIT') {
                return response()->json([
                    'message' => 'Only transfers in IN_TRANSIT status can generate delivery orders'
                ], 400);
            }

            // Check if delivery order already exists for this transfer
            $existingDO = DeliveryOrder::where('source_type', 'IT')
                ->where('source_id', $transfer->id)
                ->first();

            if ($existingDO) {
                return response()->json([
                    'message' => 'Delivery order already exists for this transfer',
                    'delivery_order' => $existingDO
                ], 200);
            }

            // Transform data using transformer
            $deliveryData = DeliveryOrderTransformer::transformFromWarehouseTransfer($transfer);
            $companyData = DeliveryOrderTransformer::getCompanyData();

            // Generate PDF using universal template
            $pdf = PDF::loadView('pdf.delivery-order-universal', [
                'delivery' => $deliveryData,
                'company' => $companyData,
                'source_type' => 'IT' // Internal Transfer
            ]);
            $pdfContent = $pdf->output();

            $filename = "DeliveryOrder_Transfer_" . str_replace(['/', '\\'], '_', $deliveryData['delivery_no']) . ".pdf";

            return response()->json([
                'message' => 'Delivery order generated successfully',
                'delivery_order_number' => $deliveryData['delivery_no'],
                'pdf_content' => base64_encode($pdfContent),
                'filename' => $filename
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate delivery order: ' . $e->getMessage()
            ], 500);
        }
    }
}
