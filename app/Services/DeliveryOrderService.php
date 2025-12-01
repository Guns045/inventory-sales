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

            if (!in_array($salesOrder->status, ['READY_TO_SHIP', 'PROCESSING'])) {
                throw new \Exception('Cannot generate delivery order. Sales order must be in READY_TO_SHIP or PROCESSING status.');
            }

            // Check if delivery order already exists
            $existingDeliveryOrder = DeliveryOrder::where('sales_order_id', $salesOrderId)->first();
            if ($existingDeliveryOrder) {
                throw new \Exception('Delivery Order already exists for this Sales Order.');
            }

            // Calculate total amount
            $totalAmount = 0;
            foreach ($salesOrder->items as $item) {
                $totalAmount += $item->quantity * $item->unit_price;
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
                'notes' => isset($data['kurir']) ? 'Kurir: ' . $data['kurir'] : null,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
                'total_amount' => $totalAmount,
                'source_type' => 'SO',
                'source_id' => $salesOrder->id,
            ]);

            // Create delivery order items
            foreach ($salesOrder->items as $item) {
                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'product_id' => $item->product_id,
                    'quantity_shipped' => $item->quantity,
                    'status' => 'PREPARING',
                    'location_code' => $item->product->location_code ?? null,
                ]);
            }

            // Update sales order status
            $salesOrder->update(['status' => 'PROCESSING']);

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

            // Update sales order status
            $pickingList->salesOrder->update(['status' => 'PROCESSING']);

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
        $deliveryOrder->update($data);
        return $deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']);
    }

    /**
     * Update delivery order status
     *
     * @param DeliveryOrder $deliveryOrder
     * @param string $status
     * @return DeliveryOrder
     */
    public function updateStatus(DeliveryOrder $deliveryOrder, string $status): DeliveryOrder
    {
        return DB::transaction(function () use ($deliveryOrder, $status) {
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

            $deliveryOrder->update(['status' => $status]);

            // Update related sales order status
            if ($deliveryOrder->salesOrder) {
                $salesOrder = $deliveryOrder->salesOrder;

                if ($oldStatus !== 'READY_TO_SHIP' && $status === 'READY_TO_SHIP') {
                    $salesOrder->update(['status' => 'READY_TO_SHIP']);
                }

                if ($oldStatus !== 'SHIPPED' && $status === 'SHIPPED') {
                    $salesOrder->update(['status' => 'SHIPPED']);
                    $deliveryOrder->update(['shipping_date' => now()]);
                    $deliveryOrder->deliveryOrderItems()->update(['status' => 'IN_TRANSIT']);
                }
            }

            // If status is DELIVERED, set delivered date
            if ($oldStatus !== 'DELIVERED' && $status === 'DELIVERED') {
                $deliveryOrder->update(['delivered_at' => now()]);
                $deliveryOrder->deliveryOrderItems()->update(['status' => 'DELIVERED']);

                if ($deliveryOrder->salesOrder) {
                    $deliveryOrder->salesOrder->update(['status' => 'COMPLETED']);
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

            if ($deliveryOrder->salesOrder) {
                $deliveryOrder->salesOrder->update(['status' => 'SHIPPED']);
            }

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
                    $deliveryOrder->salesOrder->update(['status' => 'COMPLETED']);
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
            $transfer = WarehouseTransfer::with(['product', 'warehouseFrom', 'warehouseTo'])
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
                        'description' => $soItem->product->description ?? $soItem->description ?? 'No description',
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
}
