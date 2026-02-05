<?php

namespace App\Services;

use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\SalesOrder;
use App\Models\PickingList;
use App\Models\WarehouseTransfer;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\DocumentCounter;
use App\Transformers\DeliveryOrderTransformer;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class DeliveryOrderService
{
    protected $productStockService;

    public function __construct(ProductStockService $productStockService)
    {
        $this->productStockService = $productStockService;
    }

    /**
     * Create a delivery order from a sales order
     *
     * @param int $salesOrderId
     * @param array $data
     * @return DeliveryOrder
     * @throws \Exception
     */
    public function createFromSalesOrder(int $salesOrderId, array $data): DeliveryOrder
    {
        return DB::transaction(function () use ($salesOrderId, $data) {
            $salesOrder = SalesOrder::with(['customer', 'items.product'])->findOrFail($salesOrderId);

            if (!in_array($salesOrder->status, ['READY_TO_SHIP', 'PROCESSING', 'PARTIAL'])) {
                throw new \Exception('Cannot generate delivery order. Sales order must be in READY_TO_SHIP, PROCESSING or PARTIAL status.');
            }

            // Allow multiple DOs for Partial Shipment
            // Removed the check for existing Delivery Order

            // Calculate total amount for this DO
            $totalAmount = 0;
            $itemsToShip = $data['items'] ?? [];

            // If no items specified, assume full shipment of remaining items (legacy support)
            if (empty($itemsToShip)) {
                foreach ($salesOrder->items as $item) {
                    $remaining = $item->quantity - $item->quantity_shipped;
                    if ($remaining > 0) {
                        $itemsToShip[] = [
                            'id' => $item->id,
                            'quantity' => $remaining
                        ];
                    }
                }
            }

            if (empty($itemsToShip)) {
                throw new \Exception('No items to ship.');
            }

            // Generate delivery order number
            $deliveryOrderNumber = DocumentCounter::getNextNumber('DELIVERY_ORDER', $salesOrder->warehouse_id);

            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => $deliveryOrderNumber,
                'sales_order_id' => $salesOrder->id,
                'customer_id' => $salesOrder->customer_id,
                'warehouse_id' => $salesOrder->warehouse_id,
                'shipping_date' => $data['shipping_date'] ?? null,
                'shipping_contact_person' => $data['shipping_contact_person'] ?? $salesOrder->customer->contact_person,
                'shipping_address' => $data['shipping_address'] ?? $salesOrder->customer->address,
                'shipping_city' => $data['shipping_city'] ?? $salesOrder->customer->city,
                'driver_name' => $data['driver_name'] ?? null,
                'vehicle_plate_number' => $data['vehicle_plate_number'] ?? null,
                'delivery_method' => $data['delivery_method'] ?? 'Truck',
                'delivery_vendor' => $data['delivery_vendor'] ?? null,
                'tracking_number' => $data['tracking_number'] ?? null,
                'notes' => isset($data['kurir']) ? 'Kurir: ' . $data['kurir'] : null,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
                'total_amount' => 0, // Will be calculated
                'source_type' => 'SO',
                'source_id' => $salesOrder->id,
            ]);

            foreach ($itemsToShip as $shipItem) {
                $soItem = $salesOrder->items->where('id', $shipItem['id'])->first();

                if (!$soItem) {
                    continue; // Skip invalid items
                }

                $qtyToShip = $shipItem['quantity'];
                $remaining = $soItem->quantity - $soItem->quantity_shipped;

                if ($qtyToShip > $remaining) {
                    throw new \Exception("Cannot ship {$qtyToShip} for item {$soItem->product->name}. Only {$remaining} remaining.");
                }

                if ($qtyToShip <= 0) {
                    continue;
                }

                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'product_id' => $soItem->product_id,
                    'quantity_shipped' => $qtyToShip,
                    'status' => 'PREPARING',
                    'location_code' => $soItem->product->location_code ?? null,
                ]);

                // Update SO Item shipped quantity
                $soItem->increment('quantity_shipped', $qtyToShip);

                $totalAmount += $qtyToShip * $soItem->unit_price;
            }

            $deliveryOrder->update(['total_amount' => $totalAmount]);

            $deliveryOrder->update(['total_amount' => $totalAmount]);

            $this->updateRelatedSalesOrdersStatus($deliveryOrder);

            $this->logCreation($deliveryOrder, "from sales order {$salesOrder->sales_order_number}");

            return $deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']);
        });
    }

    /**
     * Create a delivery order from a picking list
     *
     * @param int $pickingListId
     * @param array $data
     * @return DeliveryOrder
     * @throws \Exception
     */
    public function createFromPickingList(int $pickingListId, array $data): DeliveryOrder
    {
        return DB::transaction(function () use ($pickingListId, $data) {
            $pickingList = PickingList::with(['salesOrder.customer', 'items.product'])->findOrFail($pickingListId);

            if (!$pickingList->canGenerateDeliveryOrder()) {
                throw new \Exception('Cannot generate delivery order. Picking list must be completed and have no existing delivery order.');
            }

            // Calculate total amount
            $totalAmount = 0;
            $salesOrderItems = $pickingList->salesOrder->salesOrderItems()->get();
            $itemPrices = [];

            foreach ($salesOrderItems as $soItem) {
                $itemPrices[$soItem->product_id] = $soItem->unit_price;
            }

            foreach ($pickingList->items as $item) {
                $unitPrice = $itemPrices[$item->product_id] ?? 0;
                $totalAmount += $item->quantity_picked * $unitPrice;
            }

            // Generate delivery order number
            $deliveryOrderNumber = DocumentCounter::getNextNumber('DELIVERY_ORDER', $pickingList->warehouse_id);

            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => $deliveryOrderNumber,
                'sales_order_id' => $pickingList->sales_order_id,
                'picking_list_id' => $pickingList->id,
                'customer_id' => $pickingList->salesOrder->customer_id,
                'warehouse_id' => $pickingList->warehouse_id,
                'shipping_date' => $data['shipping_date'] ?? null,
                'shipping_contact_person' => $data['shipping_contact_person'] ?? $pickingList->salesOrder->customer->contact_person,
                'shipping_address' => $data['shipping_address'] ?? $pickingList->salesOrder->customer->address,
                'shipping_city' => $data['shipping_city'] ?? $pickingList->salesOrder->customer->city,
                'driver_name' => $data['driver_name'] ?? null,
                'vehicle_plate_number' => $data['vehicle_plate_number'] ?? null,
                'delivery_method' => $data['delivery_method'] ?? 'Truck',
                'delivery_vendor' => $data['delivery_vendor'] ?? null,
                'tracking_number' => $data['tracking_number'] ?? null,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
                'total_amount' => $totalAmount,
                'source_type' => 'SO',
                'source_id' => $pickingList->sales_order_id,
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

            $deliveryOrder->update(['total_amount' => $totalAmount]);

            $this->updateRelatedSalesOrdersStatus($deliveryOrder);

            $this->logCreation($deliveryOrder, "from picking list {$pickingList->picking_list_number}");

            return $deliveryOrder->load(['customer', 'salesOrder', 'pickingList', 'deliveryOrderItems.product']);
        });
    }

    /**
     * Update a delivery order
     *
     * @param DeliveryOrder $deliveryOrder
     * @param array $data
     * @return DeliveryOrder
     */
    public function updateDeliveryOrder(DeliveryOrder $deliveryOrder, array $data): DeliveryOrder
    {
        return DB::transaction(function () use ($deliveryOrder, $data) {
            $deliveryOrder->update($data);

            if (isset($data['items']) && is_array($data['items'])) {
                $salesOrder = $deliveryOrder->salesOrder;

                foreach ($data['items'] as $itemData) {
                    $doItem = DeliveryOrderItem::find($itemData['id']);
                    if (!$doItem || $doItem->delivery_order_id !== $deliveryOrder->id) {
                        continue;
                    }

                    $newQty = $itemData['quantity'];
                    $oldQty = $doItem->quantity_shipped;
                    $diff = $newQty - $oldQty;

                    if ($diff === 0) {
                        continue;
                    }

                    // Validate against SO remaining quantity
                    $soItem = $salesOrder->items->where('product_id', $doItem->product_id)->first();
                    if ($soItem) {
                        // The "true" remaining excluding this DO item is: ($soItem->quantity - ($soItem->quantity_shipped - $oldQty)).
                        // So newQty must be <= ($soItem->quantity - $soItem->quantity_shipped + $oldQty).

                        $maxAllowed = $soItem->quantity - $soItem->quantity_shipped + $oldQty;
                        if ($newQty > $maxAllowed) {
                            throw new \Exception("Cannot ship {$newQty} for item {$soItem->product->name}. Max allowed is {$maxAllowed}.");
                        }

                        $doItem->update(['quantity_shipped' => $newQty]);
                        $soItem->increment('quantity_shipped', $diff);
                    }
                }

                // Recalculate total amount
                $deliveryOrder->refresh();
                $recalcTotal = 0;
                foreach ($deliveryOrder->deliveryOrderItems as $doItem) {
                    $soItem = $salesOrder->items->where('product_id', $doItem->product_id)->first();
                    $recalcTotal += $doItem->quantity_shipped * ($soItem->unit_price ?? 0);
                }
                $deliveryOrder->update(['total_amount' => $recalcTotal]);

                $this->updateRelatedSalesOrdersStatus($deliveryOrder);
            }

            return $deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']);
        });
    }

    /**
     * Update delivery order status
     *
     * @param DeliveryOrder $deliveryOrder
     * @param string $status
     * @return DeliveryOrder
     */
    public function updateStatus(DeliveryOrder $deliveryOrder, string $status, array $data = []): DeliveryOrder
    {
        return DB::transaction(function () use ($deliveryOrder, $status, $data) {
            $oldStatus = $deliveryOrder->status;

            // If status is SHIPPED, deduct stock
            if ($oldStatus !== 'SHIPPED' && $status === 'SHIPPED') {
                foreach ($deliveryOrder->deliveryOrderItems as $item) {
                    $this->productStockService->deductStock(
                        $item->product_id,
                        $deliveryOrder->warehouse_id,
                        $item->quantity_shipped,
                        'App\Models\DeliveryOrder',
                        $deliveryOrder->id,
                        "Shipped DO {$deliveryOrder->delivery_order_number}"
                    );
                }
            }

            // Update status and other data (shipping details)
            $updateData = ['status' => $status];

            // Filter only allowed fields from data to prevent overwriting protected fields
            $allowedFields = [
                'shipping_date',
                'driver_name',
                'vehicle_plate_number',
                'tracking_number',
                'delivery_vendor',
                'delivery_method',
                'shipping_contact_person'
            ];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }

            $deliveryOrder->update($updateData);

            if ($deliveryOrder->salesOrder) {
                $this->updateRelatedSalesOrdersStatus($deliveryOrder);

                if ($oldStatus !== 'SHIPPED' && $status === 'SHIPPED') {
                    $deliveryOrder->update(['shipping_date' => now()]);
                    $deliveryOrder->deliveryOrderItems()->update(['status' => 'IN_TRANSIT']);
                }
            }

            // If status is DELIVERED, set delivered date
            if ($oldStatus !== 'DELIVERED' && $status === 'DELIVERED') {
                $deliveryOrder->update(['delivered_at' => now()]);
                $deliveryOrder->deliveryOrderItems()->update(['status' => 'DELIVERED']);

                if ($deliveryOrder->salesOrder) {
                    $this->updateRelatedSalesOrdersStatus($deliveryOrder);
                }
            }

            // Log activity
            ActivityLog::log(
                'UPDATE_DELIVERY_ORDER_STATUS',
                "User updated Delivery Order {$deliveryOrder->delivery_order_number} status from {$oldStatus} to {$status}",
                $deliveryOrder,
                ['status' => $oldStatus],
                ['status' => $status]
            );

            // Send notifications
            $this->sendStatusNotifications($deliveryOrder, $status);

            return $deliveryOrder->refresh();
        });
    }

    /**
     * Mark delivery order as shipped
     *
     * @param DeliveryOrder $deliveryOrder
     * @return DeliveryOrder
     * @throws \Exception
     */
    public function markAsShipped(DeliveryOrder $deliveryOrder): DeliveryOrder
    {
        if ($deliveryOrder->status !== 'PREPARING') {
            throw new \Exception("Delivery order cannot be shipped. Current status: {$deliveryOrder->status_label}");
        }

        return DB::transaction(function () use ($deliveryOrder) {
            // Deduct stock
            foreach ($deliveryOrder->deliveryOrderItems as $item) {
                $this->productStockService->deductStock(
                    $item->product_id,
                    $deliveryOrder->warehouse_id,
                    $item->quantity_shipped,
                    'App\Models\DeliveryOrder',
                    $deliveryOrder->id,
                    "Shipped DO {$deliveryOrder->delivery_order_number}"
                );
            }

            $deliveryOrder->update([
                'status' => 'SHIPPED',
                'shipping_date' => now(),
            ]);

            $deliveryOrder->deliveryOrderItems()->update(['status' => 'IN_TRANSIT']);

            $this->updateRelatedSalesOrdersStatus($deliveryOrder);

            ActivityLog::log(
                'MARK_DELIVERY_ORDER_SHIPPED',
                "Marked delivery order {$deliveryOrder->delivery_order_number} as shipped",
                $deliveryOrder
            );

            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Delivery Order Shipped',
                'message' => "Delivery Order {$deliveryOrder->delivery_order_number} has been shipped",
                'type' => 'info',
                'module' => 'Delivery Order',
                'data_id' => $deliveryOrder->id,
                'read' => false,
            ]);

            return $deliveryOrder->refresh();
        });
    }

    /**
     * Mark delivery order as delivered
     *
     * @param DeliveryOrder $deliveryOrder
     * @param array $data
     * @return DeliveryOrder
     * @throws \Exception
     */
    public function markAsDelivered(DeliveryOrder $deliveryOrder, array $data): DeliveryOrder
    {
        if (!$deliveryOrder->canBeDelivered()) {
            throw new \Exception("Delivery order cannot be marked as delivered. Current status: {$deliveryOrder->status_label}");
        }

        return DB::transaction(function () use ($deliveryOrder, $data) {
            $allDelivered = true;

            foreach ($data['delivery_items'] as $deliveryItem) {
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
                    'recipient_name' => $data['recipient_name'] ?? null,
                    'recipient_title' => $data['recipient_title'] ?? null,
                ]);

                if ($deliveryOrder->salesOrder) {
                    $this->updateRelatedSalesOrdersStatus($deliveryOrder);
                }
            }

            ActivityLog::log(
                'MARK_DELIVERY_ORDER_DELIVERED',
                "Marked delivery order {$deliveryOrder->delivery_order_number} items as delivered",
                $deliveryOrder
            );

            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Delivery Order Delivered',
                'message' => "Items from Delivery Order {$deliveryOrder->delivery_order_number} have been delivered",
                'type' => 'success',
                'module' => 'Delivery Order',
                'data_id' => $deliveryOrder->id,
                'read' => false,
            ]);

            return $deliveryOrder->refresh();
        });
    }

    /**
     * Generate PDF for delivery order
     *
     * @param DeliveryOrder $deliveryOrder
     * @return mixed
     */
    public function generatePDF(DeliveryOrder $deliveryOrder)
    {
        // Load relationships
        $deliveryOrder->load([
            'customer',
            'salesOrder',
            'deliveryOrderItems.product',
            'salesOrder.salesOrderItems.product',
            'createdBy'
        ]);

        // Check source type and transform accordingly
        if ($deliveryOrder->source_type === 'IT' && $deliveryOrder->source_id) {
            $transfer = WarehouseTransfer::with(['items.product', 'warehouseFrom', 'warehouseTo'])
                ->findOrFail($deliveryOrder->source_id);
            $deliveryData = DeliveryOrderTransformer::transformFromWarehouseTransfer($transfer, $deliveryOrder);
            $sourceType = 'IT';
        } else {
            // Handle empty items case
            if ($deliveryOrder->deliveryOrderItems->isEmpty() && $deliveryOrder->salesOrder) {
                $deliveryData = DeliveryOrderTransformer::transform($deliveryOrder);

                // Replace empty items with sales order items
                $salesOrderItems = [];
                foreach ($deliveryOrder->salesOrder->salesOrderItems as $soItem) {
                    $salesOrderItems[] = [
                        'part_number' => $soItem->product->sku ?? $soItem->product_code ?? 'N/A',
                        'description' => $soItem->product->name ?? $soItem->product->description ?? $soItem->description ?? 'No description',
                        'quantity' => $soItem->quantity,
                        'po_number' => 'N/A',
                        'delivery_method' => 'Truck',
                        'delivery_vendor' => 'Internal'
                    ];
                }
                $deliveryData['items'] = $salesOrderItems;
            } else {
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

        // Generate PDF
        $pdf = PDF::loadView('pdf.delivery-order-universal', [
            'company' => $companyData,
            'delivery' => $deliveryData,
            'source_type' => $sourceType
        ])->setPaper('a4', 'portrait');

        return $pdf;
    }

    private function logCreation(DeliveryOrder $deliveryOrder, string $source)
    {
        ActivityLog::log(
            'CREATE_DELIVERY_ORDER',
            "Created delivery order {$deliveryOrder->delivery_order_number} {$source}",
            $deliveryOrder
        );

        Notification::create([
            'user_id' => auth()->id(),
            'title' => 'Delivery Order Created',
            'message' => "Delivery Order {$deliveryOrder->delivery_order_number} has been created",
            'type' => 'success',
            'module' => 'Delivery Order',
            'data_id' => $deliveryOrder->id,
            'read' => false,
        ]);
    }

    /**
     * Create a consolidated delivery order from multiple sales orders
     */
    public function createConsolidated(array $data): DeliveryOrder
    {
        return DB::transaction(function () use ($data) {
            $firstItem = \App\Models\SalesOrderItem::with('salesOrder.customer')->findOrFail($data['items'][0]['sales_order_item_id']);
            $deliveryOrderNumber = DocumentCounter::getNextNumber('DELIVERY_ORDER', $firstItem->salesOrder->warehouse_id ?? 1);

            $totalAmount = 0;

            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => $deliveryOrderNumber,
                'customer_id' => $data['customer_id'],
                'sales_order_id' => $firstItem->sales_order_id,
                'warehouse_id' => $firstItem->salesOrder->warehouse_id ?? 1,
                'shipping_date' => $data['shipping_date'],
                'status' => 'PREPARING',
                'shipping_address' => $data['shipping_address'],
                'shipping_city' => $firstItem->salesOrder->customer->city ?? null,
                'shipping_contact_person' => $firstItem->salesOrder->customer->contact_person ?? null,
                'driver_name' => $data['driver_name'] ?? null,
                'vehicle_plate_number' => $data['vehicle_plate_number'] ?? null,
                'source_type' => 'SO',
                'source_id' => $firstItem->sales_order_id,
                'created_by' => auth()->id(),
                'total_amount' => 0,
            ]);

            foreach ($data['items'] as $itemData) {
                $salesOrderItem = \App\Models\SalesOrderItem::with('product')->findOrFail($itemData['sales_order_item_id']);

                $pending = $salesOrderItem->quantity - $salesOrderItem->quantity_shipped;
                if ($itemData['quantity_to_ship'] > $pending) {
                    throw new \Exception("Quantity to ship ({$itemData['quantity_to_ship']}) exceeds remaining quantity ({$pending}) for Item {$salesOrderItem->product->name}");
                }

                // Create DO Item
                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'sales_order_item_id' => $salesOrderItem->id,
                    'product_id' => $salesOrderItem->product_id,
                    'quantity_shipped' => $itemData['quantity_to_ship'],
                    'quantity_delivered' => 0,
                    'status' => 'PREPARING',
                ]);

                // Update SO Item Shipped Qty
                $salesOrderItem->increment('quantity_shipped', $itemData['quantity_to_ship']);

                // Calculation for header total
                $totalAmount += $itemData['quantity_to_ship'] * ($salesOrderItem->unit_price ?? 0);
            }

            $deliveryOrder->update(['total_amount' => $totalAmount]);

            // Centralized status update for all related SOs
            $this->updateRelatedSalesOrdersStatus($deliveryOrder);

            $this->logCreation($deliveryOrder, "consolidated from multiple sales orders");

            return $deliveryOrder->load('deliveryOrderItems.product');
        });
    }

    private function sendStatusNotifications(DeliveryOrder $deliveryOrder, string $status)
    {
        if ($status === 'READY_TO_SHIP') {
            Notification::createForRole(
                config('inventory.roles.warehouse_staff', 'Gudang'),
                "Delivery Order {$deliveryOrder->delivery_order_number} is ready to ship",
                'info',
                '/delivery-orders'
            );
        } elseif ($status === 'SHIPPED') {
            Notification::createForRole(
                config('inventory.roles.finance', 'Finance'),
                "Delivery Order {$deliveryOrder->delivery_order_number} has been shipped. Ready for invoicing.",
                'info',
                '/delivery-orders'
            );
        } elseif ($status === 'DELIVERED') {
            Notification::createForRole(
                config('inventory.roles.finance', 'Finance'),
                "Delivery Order {$deliveryOrder->delivery_order_number} delivered. Please ensure invoice is created.",
                'success',
                '/delivery-orders'
            );
        }
    }

    /**
     * Update statuses of all Sales Orders associated with a Delivery Order.
     */
    private function updateRelatedSalesOrdersStatus(DeliveryOrder $deliveryOrder)
    {
        // 1. Find all Sales Orders involved in this DO
        $salesOrderIds = DeliveryOrderItem::where('delivery_order_id', $deliveryOrder->id)
            ->whereNotNull('sales_order_item_id')
            ->with('salesOrderItem')
            ->get()
            ->pluck('salesOrderItem.sales_order_id')
            ->unique()
            ->filter()
            ->values();

        // Also include the primary sales order linked to the DO
        if ($deliveryOrder->sales_order_id && !$salesOrderIds->contains($deliveryOrder->sales_order_id)) {
            $salesOrderIds->push($deliveryOrder->sales_order_id);
        }

        foreach ($salesOrderIds as $soId) {
            $salesOrder = SalesOrder::with('items')->find($soId);
            if (!$salesOrder)
                continue;

            $totalOrdered = $salesOrder->items->sum('quantity');
            $totalShippedInItems = $salesOrder->items->sum('quantity_shipped');

            // Calculate delivered quantity from ALL DOs for THIS Sales Order
            $totalDelivered = DeliveryOrderItem::whereIn('sales_order_item_id', $salesOrder->items->pluck('id'))
                ->whereHas('deliveryOrder', function ($q) {
                    $q->where('status', 'DELIVERED');
                })
                ->sum('quantity_delivered');

            // Calculate ready_to_ship or better quantity (includes delivered)
            $totalReadyOrShipped = DeliveryOrderItem::whereIn('sales_order_item_id', $salesOrder->items->pluck('id'))
                ->whereHas('deliveryOrder', function ($q) {
                    $q->whereIn('status', ['READY_TO_SHIP', 'SHIPPED', 'DELIVERED']);
                })
                ->sum('quantity_shipped');

            // Determine status
            if ($totalDelivered >= $totalOrdered && $totalOrdered > 0) {
                $newStatus = 'COMPLETED';
            } elseif ($totalShippedInItems >= $totalOrdered && $totalOrdered > 0) {
                // If all shipped, check if they are in transition or already at destination
                $newStatus = ($totalReadyOrShipped >= $totalOrdered) ? 'SHIPPED' : 'PARTIAL';
            } elseif ($totalReadyOrShipped >= $totalOrdered && $totalOrdered > 0) {
                $newStatus = 'READY_TO_SHIP';
            } elseif ($totalShippedInItems > 0 || $totalReadyOrShipped > 0 || $totalDelivered > 0) {
                $newStatus = 'PARTIAL';
            } else {
                $newStatus = 'PROCESSING';
            }

            $salesOrder->update(['status' => $newStatus]);
        }
    }
}
