<?php

namespace App\Services;

use App\Models\WarehouseTransfer;
use App\Models\User;
use App\Models\PickingList;
use App\Models\DeliveryOrder;
use App\Models\SalesOrder;
use App\Models\Customer;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\DocumentCounter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WarehouseTransferService
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * Create a new warehouse transfer request
     */
    public function requestTransfer(array $data, User $user): WarehouseTransfer
    {
        return DB::transaction(function () use ($data, $user) {
            $transfer = WarehouseTransfer::create([
                'transfer_number' => $this->generateTransferNumber($data['warehouse_from_id']),
                'product_id' => $data['product_id'],
                'warehouse_from_id' => $data['warehouse_from_id'],
                'warehouse_to_id' => $data['warehouse_to_id'],
                'quantity_requested' => $data['quantity_requested'],
                'notes' => $data['notes'] ?? null,
                'requested_by' => $user->id,
                'status' => 'REQUESTED',
                'requested_at' => now(),
            ]);

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_REQUESTED',
                'description' => "User {$user->name} created warehouse transfer {$transfer->transfer_number} for {$transfer->quantity_requested} units",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            Notification::createForRole(
                config('inventory.roles.warehouse_staff', 'Gudang'),
                "New warehouse transfer request: {$transfer->transfer_number} - {$transfer->quantity_requested} units needed",
                'info',
                '/warehouse/transfers',
                ['title' => 'New Transfer Request']
            );

            return $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'requestedBy']);
        });
    }

    /**
     * Approve a transfer request
     */
    public function approveTransfer(WarehouseTransfer $transfer, User $user, ?string $notes = null): array
    {
        if (!$transfer->canBeApproved()) {
            throw new \Exception('This transfer cannot be approved.');
        }

        // Check stock availability using InventoryService
        $availableStock = $this->inventoryService->getAvailableStock($transfer->product_id, $transfer->warehouse_from_id);
        if ($availableStock < $transfer->quantity_requested) {
            throw new \Exception("Insufficient stock available. Available: {$availableStock}, Requested: {$transfer->quantity_requested}");
        }

        return DB::transaction(function () use ($transfer, $user, $notes) {
            $transfer->update([
                'status' => 'APPROVED',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'notes' => $notes ?? $transfer->notes,
            ]);

            // Create Picking List
            $pickingList = PickingList::create([
                'picking_list_number' => DocumentCounter::getNextNumber('PICKING_LIST', $transfer->warehouse_from_id),
                'sales_order_id' => null, // Not associated with sales order
                'warehouse_id' => $transfer->warehouse_from_id,
                'user_id' => $user->id,
                'status' => 'DRAFT',
                'notes' => "For warehouse transfer: {$transfer->transfer_number}",
            ]);

            $pickingList->items()->create([
                'product_id' => $transfer->product_id,
                'warehouse_id' => $transfer->warehouse_from_id,
                'quantity_required' => $transfer->quantity_requested,
                'quantity_picked' => 0,
                'status' => 'PENDING',
            ]);

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_APPROVED',
                'description' => "User {$user->name} approved warehouse transfer {$transfer->transfer_number}",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            Notification::createForRole(
                config('inventory.roles.warehouse_staff', 'Gudang'),
                "Warehouse transfer approved: {$transfer->transfer_number} - Ready for picking",
                'success',
                '/picking-lists',
                ['title' => 'Transfer Approved']
            );

            return [
                'transfer' => $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'approvedBy']),
                'picking_list' => $pickingList
            ];
        });
    }

    /**
     * Deliver the transfer (Create Delivery Order and reduce stock)
     */
    public function deliverTransfer(WarehouseTransfer $transfer, User $user, array $data): array
    {
        if (!$transfer->canBeDelivered()) {
            throw new \Exception('This transfer cannot be delivered.');
        }

        if ($data['quantity_delivered'] > $transfer->quantity_requested) {
            throw new \Exception('Delivered quantity cannot exceed requested quantity.');
        }

        return DB::transaction(function () use ($transfer, $user, $data) {
            $transfer->update([
                'status' => 'IN_TRANSIT',
                'quantity_delivered' => $data['quantity_delivered'],
                'delivered_by' => $user->id,
                'delivered_at' => now(),
                'notes' => $data['notes'] ?? $transfer->notes,
            ]);

            // Create Delivery Order logic (including dummy Sales Order if needed)
            $deliveryOrder = $this->createDeliveryOrderForTransfer($transfer, $user, $data['quantity_delivered']);

            // Reduce stock from source warehouse
            $this->inventoryService->reduceStock(
                $transfer->product_id,
                $transfer->warehouse_from_id,
                $data['quantity_delivered'],
                "Warehouse transfer: {$transfer->transfer_number} - To {$transfer->warehouseTo->name}",
                $transfer->id,
                WarehouseTransfer::class
            );

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_DELIVERED',
                'description' => "User {$user->name} delivered {$data['quantity_delivered']} units for transfer {$transfer->transfer_number}",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            Notification::createForRole(
                config('inventory.roles.warehouse_staff', 'Gudang'),
                "Incoming delivery: {$deliveryOrder->delivery_order_number} from {$transfer->warehouseFrom->name}",
                'info',
                '/delivery-orders',
                ['title' => 'Incoming Delivery']
            );

            return [
                'transfer' => $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'deliveredBy']),
                'delivery_order' => $deliveryOrder
            ];
        });
    }

    /**
     * Receive the transfer (Update stock at destination)
     */
    public function receiveTransfer(WarehouseTransfer $transfer, User $user, array $data): WarehouseTransfer
    {
        if (!$transfer->canBeReceived()) {
            throw new \Exception('This transfer cannot be received.');
        }

        if ($data['quantity_received'] > $transfer->quantity_delivered) {
            throw new \Exception('Received quantity cannot exceed delivered quantity.');
        }

        return DB::transaction(function () use ($transfer, $user, $data) {
            $transfer->update([
                'status' => 'RECEIVED',
                'quantity_received' => $data['quantity_received'],
                'received_by' => $user->id,
                'received_at' => now(),
                'notes' => $data['notes'] ?? $transfer->notes,
            ]);

            // Update Delivery Order status
            $deliveryOrder = DeliveryOrder::where('source_type', 'IT')
                ->where('source_id', $transfer->id)
                ->first();

            if ($deliveryOrder) {
                $deliveryOrder->update(['status' => 'DELIVERED']);
                // Also update DO item status if needed, though DO structure might vary
            }

            // Add stock to destination warehouse
            $this->inventoryService->addStock(
                $transfer->product_id,
                $transfer->warehouse_to_id,
                $data['quantity_received'],
                "Warehouse transfer received: {$transfer->transfer_number} from {$transfer->warehouseFrom->name}",
                $transfer->id,
                WarehouseTransfer::class
            );

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_RECEIVED',
                'description' => "User {$user->name} received {$data['quantity_received']} units for transfer {$transfer->transfer_number}",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            Notification::createForRole(
                config('inventory.roles.warehouse_staff', 'Gudang'),
                "Transfer received: {$transfer->transfer_number} - {$data['quantity_received']} units received",
                'success',
                '/warehouse/transfers',
                ['title' => 'Transfer Received']
            );

            return $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'receivedBy']);
        });
    }

    /**
     * Cancel the transfer
     */
    public function cancelTransfer(WarehouseTransfer $transfer, User $user, string $reason): WarehouseTransfer
    {
        if (!$transfer->canBeCancelled()) {
            throw new \Exception('This transfer cannot be cancelled.');
        }

        return DB::transaction(function () use ($transfer, $user, $reason) {
            $transfer->update([
                'status' => 'CANCELLED',
                'reason' => $reason,
            ]);

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_CANCELLED',
                'description' => "User {$user->name} cancelled warehouse transfer {$transfer->transfer_number}. Reason: {$reason}",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            return $transfer;
        });
    }

    /**
     * Generate Transfer Number
     */
    private function generateTransferNumber(int $warehouseId): string
    {
        return DocumentCounter::getNextNumber('WAREHOUSE_TRANSFER', $warehouseId);
    }

    /**
     * Helper to create Delivery Order for Internal Transfer
     */
    private function createDeliveryOrderForTransfer(WarehouseTransfer $transfer, User $user, int $quantity): DeliveryOrder
    {
        $deliveryOrderNumber = DocumentCounter::getNextNumber('DELIVERY_ORDER', $transfer->warehouse_from_id);

        $deliveryOrder = DeliveryOrder::create([
            'delivery_order_number' => $deliveryOrderNumber,
            'sales_order_id' => null,
            'warehouse_id' => $transfer->warehouse_from_id,
            'source_type' => 'IT',
            'source_id' => $transfer->id,
            'customer_id' => null,
            'status' => 'PREPARING',
            'notes' => "For warehouse transfer: {$transfer->transfer_number}",
            'created_by' => $user->id,
        ]);

        $deliveryOrder->deliveryOrderItems()->create([
            'product_id' => $transfer->product_id,
            'quantity_shipped' => $quantity,
            'status' => 'PREPARING',
            'notes' => "Transfer from {$transfer->warehouseFrom->name} to {$transfer->warehouseTo->name}",
        ]);

        return $deliveryOrder;
    }

    public function getStatistics(User $user)
    {
        $query = WarehouseTransfer::query();
        $query->forUser($user);

        return [
            'total_transfers' => $query->count(),
            'requested' => (clone $query)->where('status', 'REQUESTED')->count(),
            'approved' => (clone $query)->where('status', 'APPROVED')->count(),
            'in_transit' => (clone $query)->where('status', 'IN_TRANSIT')->count(),
            'received' => (clone $query)->where('status', 'RECEIVED')->count(),
            'cancelled' => (clone $query)->where('status', 'CANCELLED')->count(),
        ];
    }
}
