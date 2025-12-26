<?php

namespace App\Services;

use App\Models\WarehouseTransfer;
use App\Models\WarehouseTransferItem;
use App\Models\User;
use App\Models\PickingList;
use App\Models\DeliveryOrder;
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
                'warehouse_from_id' => $data['warehouse_from_id'],
                'warehouse_to_id' => $data['warehouse_to_id'],
                'notes' => $data['notes'] ?? null,
                'requested_by' => $user->id,
                'status' => 'REQUESTED',
                'requested_at' => now(),
            ]);

            foreach ($data['items'] as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity_requested' => $item['quantity_requested'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_REQUESTED',
                'description' => "User {$user->name} created warehouse transfer {$transfer->transfer_number} with " . count($data['items']) . " items",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            Notification::createForRole(
                config('inventory.roles.warehouse_staff', 'Gudang'),
                "New warehouse transfer request: {$transfer->transfer_number}",
                'info',
                '/warehouse/transfers',
                ['title' => 'New Transfer Request']
            );

            return $transfer->load(['items.product', 'warehouseFrom', 'warehouseTo', 'requestedBy']);
        });
    }

    /**
     * Update an existing warehouse transfer request
     */
    public function updateTransfer(WarehouseTransfer $transfer, User $user, array $data): WarehouseTransfer
    {
        if ($transfer->status !== 'REQUESTED') {
            throw new \Exception('Only requested transfers can be updated.');
        }

        if ($transfer->requested_by !== $user->id && !$user->hasPermission('transfers', 'update')) {
            throw new \Exception('You do not have permission to update this transfer.');
        }

        return DB::transaction(function () use ($transfer, $user, $data) {
            $transfer->update([
                'warehouse_from_id' => $data['warehouse_from_id'],
                'warehouse_to_id' => $data['warehouse_to_id'],
                'notes' => $data['notes'] ?? null,
            ]);

            // Sync items: Delete all and recreate (simplest approach for now)
            $transfer->items()->delete();
            foreach ($data['items'] as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity_requested' => $item['quantity_requested'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_UPDATED',
                'description' => "User {$user->name} updated warehouse transfer {$transfer->transfer_number}",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            return $transfer->load(['items.product', 'warehouseFrom', 'warehouseTo', 'requestedBy']);
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

        $transfer->load('items');

        // Check stock availability for all items
        foreach ($transfer->items as $item) {
            $availableStock = $this->inventoryService->getAvailableStock($item->product_id, $transfer->warehouse_from_id);
            if ($availableStock < $item->quantity_requested) {
                throw new \Exception("Insufficient stock for product ID {$item->product_id}. Available: {$availableStock}, Requested: {$item->quantity_requested}");
            }
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
                'sales_order_id' => null,
                'warehouse_id' => $transfer->warehouse_from_id,
                'user_id' => $user->id,
                'status' => 'DRAFT',
                'notes' => "For warehouse transfer: {$transfer->transfer_number}",
            ]);

            foreach ($transfer->items as $item) {
                $pickingList->items()->create([
                    'product_id' => $item->product_id,
                    'warehouse_id' => $transfer->warehouse_from_id,
                    'quantity_required' => $item->quantity_requested,
                    'quantity_picked' => 0,
                    'status' => 'PENDING',
                ]);
            }

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
                'transfer' => $transfer->load(['items.product', 'warehouseFrom', 'warehouseTo', 'approvedBy']),
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

        // Validate items if passed, or assume full delivery if not detailed?
        // For simplicity, let's assume we deliver what was requested for now, 
        // or we need a way to map delivered quantities to items.
        // The current request structure likely needs to support item-level delivery details.
        // But to keep it compatible with the prompt "can add multiple parts", 
        // let's assume full delivery of all items for this step, 
        // or basic partial support where we update each item.

        // Let's assume the $data contains an 'items' array with 'id' (item id) and 'quantity_delivered'
        // If not, we might need to auto-fill.

        return DB::transaction(function () use ($transfer, $user, $data) {
            $transfer->load('items');

            // Update transfer status
            $transfer->update([
                'status' => 'IN_TRANSIT',
                'delivered_by' => $user->id,
                'delivered_at' => now(),
                'notes' => $data['notes'] ?? $transfer->notes,
            ]);

            // Create Delivery Order
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

            foreach ($transfer->items as $item) {
                // Find delivered qty for this item from input data, or default to requested
                $deliveredQty = $item->quantity_requested;
                if (isset($data['items'])) {
                    foreach ($data['items'] as $inputItem) {
                        if ($inputItem['id'] == $item->id) {
                            $deliveredQty = $inputItem['quantity_delivered'];
                            break;
                        }
                    }
                } elseif (isset($data['quantity_delivered'])) {
                    // Fallback for single item legacy or bulk same-qty (unlikely useful)
                    // Better to default to requested if not specified
                }

                $item->update(['quantity_delivered' => $deliveredQty]);

                $deliveryOrder->deliveryOrderItems()->create([
                    'product_id' => $item->product_id,
                    'quantity_shipped' => $deliveredQty,
                    'status' => 'PREPARING',
                    'notes' => "Transfer item",
                ]);

                // Reduce stock
                $this->inventoryService->reduceStock(
                    $item->product_id,
                    $transfer->warehouse_from_id,
                    $deliveredQty,
                    "Warehouse transfer: {$transfer->transfer_number} - To {$transfer->warehouseTo->name}",
                    $transfer->id,
                    WarehouseTransfer::class
                );
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_DELIVERED',
                'description' => "User {$user->name} delivered items for transfer {$transfer->transfer_number}",
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
                'transfer' => $transfer->load(['items.product', 'warehouseFrom', 'warehouseTo', 'deliveredBy']),
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

        return DB::transaction(function () use ($transfer, $user, $data) {
            $transfer->load('items');

            $transfer->update([
                'status' => 'RECEIVED',
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
            }

            foreach ($transfer->items as $item) {
                // Determine received qty
                $receivedQty = $item->quantity_delivered; // Default to delivered
                if (isset($data['items'])) {
                    foreach ($data['items'] as $inputItem) {
                        if ($inputItem['id'] == $item->id) {
                            $receivedQty = $inputItem['quantity_received'];
                            break;
                        }
                    }
                }

                $item->update(['quantity_received' => $receivedQty]);

                // Add stock
                $this->inventoryService->addStock(
                    $item->product_id,
                    $transfer->warehouse_to_id,
                    $receivedQty,
                    "Warehouse transfer received: {$transfer->transfer_number} from {$transfer->warehouseFrom->name}",
                    $transfer->id,
                    WarehouseTransfer::class
                );
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'WAREHOUSE_TRANSFER_RECEIVED',
                'description' => "User {$user->name} received items for transfer {$transfer->transfer_number}",
                'reference_type' => 'WarehouseTransfer',
                'reference_id' => $transfer->id,
            ]);

            Notification::createForRole(
                config('inventory.roles.warehouse_staff', 'Gudang'),
                "Transfer received: {$transfer->transfer_number}",
                'success',
                '/warehouse/transfers',
                ['title' => 'Transfer Received']
            );

            return $transfer->load(['items.product', 'warehouseFrom', 'warehouseTo', 'receivedBy']);
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
