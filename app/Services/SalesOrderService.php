<?php

namespace App\Services;

use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Quotation;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\DeliveryOrder;
use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\ProductStock;
use App\Models\DocumentCounter;
use App\Traits\DocumentNumberHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SalesOrderService
{
    use DocumentNumberHelper;

    /**
     * Create a new sales order
     *
     * @param array $data
     * @return SalesOrder
     */
    public function createSalesOrder(array $data): SalesOrder
    {
        return DB::transaction(function () use ($data) {
            $quotation = null;
            $warehouseId = null;

            // If creating from quotation, inherit warehouse_id
            if (isset($data['quotation_id'])) {
                $quotation = Quotation::findOrFail($data['quotation_id']);
                $warehouseId = $quotation->warehouse_id;
            }

            // Create the sales order with warehouse-specific numbering
            $salesOrder = SalesOrder::create([
                'sales_order_number' => $this->generateSalesOrderNumber($warehouseId),
                'quotation_id' => $data['quotation_id'] ?? null,
                'customer_id' => $data['customer_id'],
                'user_id' => auth()->id(),
                'warehouse_id' => $warehouseId,
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
            ]);

            // Create sales order items
            if (isset($data['quotation_id'])) {
                $this->createItemsFromQuotation($salesOrder, $quotation);
            } elseif (isset($data['items'])) {
                $this->createItemsFromRequest($salesOrder, $data['items']);
            }

            // Log activity
            $this->logCreationActivity($salesOrder, $quotation);

            // Send notifications
            $this->sendCreationNotifications($salesOrder, isset($data['quotation_id']));

            return $salesOrder->load(['customer', 'user', 'salesOrderItems.product', 'warehouse']);
        });
    }

    /**
     * Update an existing sales order
     *
     * @param SalesOrder $salesOrder
     * @param array $data
     * @return SalesOrder
     */
    public function updateSalesOrder(SalesOrder $salesOrder, array $data): SalesOrder
    {
        return DB::transaction(function () use ($salesOrder, $data) {
            $warehouseId = $salesOrder->warehouse_id;

            // If quotation_id is being updated, inherit warehouse_id from the new quotation
            if (isset($data['quotation_id']) && $data['quotation_id'] !== $salesOrder->quotation_id) {
                $quotation = Quotation::findOrFail($data['quotation_id']);
                $warehouseId = $quotation->warehouse_id;
            }

            $salesOrder->update([
                'quotation_id' => $data['quotation_id'] ?? null,
                'customer_id' => $data['customer_id'],
                'warehouse_id' => $warehouseId,
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
            ]);

            // Update sales order items
            $salesOrder->salesOrderItems()->delete();
            $this->createItemsFromRequest($salesOrder, $data['items']);

            return $salesOrder->refresh()->load(['customer', 'user', 'salesOrderItems.product', 'warehouse']);
        });
    }

    /**
     * Update sales order status
     *
     * @param SalesOrder $salesOrder
     * @param string $status
     * @return SalesOrder
     */
    public function updateStatus(SalesOrder $salesOrder, string $status): SalesOrder
    {
        $oldStatus = $salesOrder->status;
        $salesOrder->update(['status' => $status]);

        // Log activity
        ActivityLog::log(
            'UPDATE_SALES_ORDER_STATUS',
            "User updated Sales Order {$salesOrder->sales_order_number} status from {$oldStatus} to {$status}",
            $salesOrder,
            ['status' => $oldStatus],
            ['status' => $status]
        );

        // Auto-create Delivery Order when status changes to PROCESSING
        if ($oldStatus !== 'PROCESSING' && $status === 'PROCESSING') {
            $this->autoCreateDeliveryOrder($salesOrder);
        }

        // Create notifications based on status
        $this->sendStatusNotifications($salesOrder, $status);

        return $salesOrder;
    }

    /**
     * Create Picking List for Sales Order
     *
     * @param SalesOrder $salesOrder
     * @param string|null $notes
     * @return PickingList
     * @throws \Exception
     */
    public function createPickingList(SalesOrder $salesOrder, ?string $notes = null): PickingList
    {
        if ($salesOrder->status !== 'PENDING') {
            throw new \Exception("Picking List can only be created for PENDING Sales Orders. Current status: {$salesOrder->status}");
        }

        // Check if picking list already exists
        $existingPickingList = PickingList::where('sales_order_id', $salesOrder->id)
            ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->first();

        if ($existingPickingList) {
            throw new \Exception('Picking List already exists for this Sales Order.');
        }

        return DB::transaction(function () use ($salesOrder, $notes) {
            $pickingList = PickingList::create([
                'sales_order_id' => $salesOrder->id,
                'user_id' => auth()->id(),
                'status' => 'READY',
                'notes' => $notes,
            ]);

            foreach ($salesOrder->items as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)->first();

                PickingListItem::create([
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

            return $pickingList->load(['salesOrder.customer', 'items.product', 'user']);
        });
    }

    private function createItemsFromQuotation(SalesOrder $salesOrder, Quotation $quotation)
    {
        foreach ($quotation->quotationItems as $item) {
            SalesOrderItem::create([
                'sales_order_id' => $salesOrder->id,
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'discount_percentage' => $item->discount_percentage,
                'tax_rate' => $item->tax_rate,
            ]);
        }
    }

    private function createItemsFromRequest(SalesOrder $salesOrder, array $items)
    {
        foreach ($items as $item) {
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

    private function logCreationActivity(SalesOrder $salesOrder, ?Quotation $quotation)
    {
        $description = $quotation
            ? "User converted quotation {$quotation->quotation_number} to Sales Order {$salesOrder->sales_order_number}"
            : "User created Sales Order {$salesOrder->sales_order_number} for {$salesOrder->customer->company_name}";

        ActivityLog::log(
            'CREATE_SALES_ORDER',
            $description,
            $salesOrder
        );
    }

    private function sendCreationNotifications(SalesOrder $salesOrder, bool $isFromQuotation)
    {
        if ($isFromQuotation) {
            Notification::createForRole(
                'Gudang',
                "New Sales Order created: {$salesOrder->sales_order_number} (from quotation)",
                'info',
                '/sales-orders'
            );
        }

        Notification::createForRole(
            'Admin',
            "New Sales Order created: {$salesOrder->sales_order_number}",
            'info',
            '/sales-orders'
        );
    }

    private function autoCreateDeliveryOrder(SalesOrder $salesOrder)
    {
        try {
            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => DocumentCounter::getNextNumber('DELIVERY_ORDER', $salesOrder->warehouse_id),
                'sales_order_id' => $salesOrder->id,
                'customer_id' => $salesOrder->customer_id,
                'source_type' => 'SO',
                'source_id' => $salesOrder->id,
                'status' => 'PREPARING',
                'created_by' => auth()->id(),
            ]);

            ActivityLog::log(
                'CREATE_DELIVERY_ORDER',
                "Auto-created Delivery Order {$deliveryOrder->delivery_order_number} from Sales Order {$salesOrder->sales_order_number}",
                $deliveryOrder
            );
        } catch (\Exception $e) {
            Log::error('Failed to auto-create delivery order', [
                'sales_order_id' => $salesOrder->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    private function sendStatusNotifications(SalesOrder $salesOrder, string $status)
    {
        if ($status === 'READY_TO_SHIP') {
            Notification::createForRole(
                'Gudang',
                "Sales Order {$salesOrder->sales_order_number} is ready to ship",
                'info',
                '/sales-orders'
            );
        } elseif ($status === 'SHIPPED') {
            Notification::createForRole(
                'Finance',
                "Sales Order {$salesOrder->sales_order_number} has been shipped. Ready for invoicing.",
                'info',
                '/sales-orders'
            );
        } elseif ($status === 'COMPLETED') {
            Notification::createForRole(
                'Finance',
                "Sales Order {$salesOrder->sales_order_number} completed. Please ensure invoice is created.",
                'success',
                '/sales-orders'
            );
        }
    }
}
