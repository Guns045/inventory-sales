<?php

namespace App\Services;

use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\SalesOrder;
use App\Models\ProductStock;
use App\Traits\DocumentNumberHelper;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class PickingListService
{
    use DocumentNumberHelper;

    /**
     * Create a new Picking List from a Sales Order.
     *
     * @param int $salesOrderId
     * @param User $user
     * @param string|null $notes
     * @return PickingList
     * @throws \Exception
     */
    public function createFromOrder(int $salesOrderId, User $user, ?string $notes = null): PickingList
    {
        return DB::transaction(function () use ($salesOrderId, $user, $notes) {
            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($salesOrderId);

            if ($salesOrder->status !== 'PENDING') {
                throw new \Exception('Sales Order is not in PENDING status.');
            }

            $existingPickingList = PickingList::where('sales_order_id', $salesOrder->id)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->first();

            if ($existingPickingList) {
                throw new \Exception('Picking List already exists for this Sales Order.');
            }

            // Determine warehouse ID based on user or default
            $warehouseId = $this->getUserWarehouseIdForPicking($user);

            $pickingList = PickingList::create([
                'picking_list_number' => $this->generatePickingListNumber($warehouseId),
                'sales_order_id' => $salesOrder->id,
                'user_id' => $user->id,
                'status' => 'READY',
                'notes' => $notes,
            ]);

            foreach ($salesOrder->items as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)
                    ->first();

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

            return $pickingList;
        });
    }

    /**
     * Update a Picking List.
     *
     * @param PickingList $pickingList
     * @param array $data
     * @return PickingList
     * @throws \Exception
     */
    public function updatePickingList(PickingList $pickingList, array $data): PickingList
    {
        return DB::transaction(function () use ($pickingList, $data) {
            $allCompleted = true;
            $hasUpdates = false;

            if (isset($data['items'])) {
                foreach ($data['items'] as $itemId => $itemData) {
                    $pickingListItem = $pickingList->items()->findOrFail($itemId);

                    $oldQuantity = $pickingListItem->quantity_picked;
                    $newQuantity = $itemData['quantity_picked'];

                    if ($oldQuantity != $newQuantity) {
                        $hasUpdates = true;
                    }

                    $status = 'PENDING';
                    if ($newQuantity >= $pickingListItem->quantity_required) {
                        $status = 'COMPLETED';
                    } elseif ($newQuantity > 0) {
                        $status = 'PARTIAL';
                    }

                    $pickingListItem->update([
                        'quantity_picked' => $newQuantity,
                        'location_code' => $itemData['location_code'] ?? $pickingListItem->location_code,
                        'notes' => $itemData['notes'] ?? $pickingListItem->notes,
                        'status' => $status,
                    ]);

                    if ($status !== 'COMPLETED') {
                        $allCompleted = false;
                    }
                }
            }

            $pickingList->update([
                'notes' => $data['notes'] ?? $pickingList->notes,
                'status' => $allCompleted ? 'COMPLETED' : ($hasUpdates ? 'PICKING' : $pickingList->status),
                'completed_at' => $allCompleted ? now() : $pickingList->completed_at,
            ]);

            if ($allCompleted) {
                $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);
            }

            return $pickingList;
        });
    }

    /**
     * Complete a Picking List.
     *
     * @param PickingList $pickingList
     * @return PickingList
     * @throws \Exception
     */
    public function completePickingList(PickingList $pickingList): PickingList
    {
        return DB::transaction(function () use ($pickingList) {
            if ($pickingList->status !== 'PICKING') {
                throw new \Exception('Picking List is not in PICKING status.');
            }

            $allItemsCompleted = $pickingList->items()
                ->where('status', '!=', 'COMPLETED')
                ->count() === 0;

            if (!$allItemsCompleted) {
                throw new \Exception('Not all items are completed.');
            }

            $pickingList->update([
                'status' => 'COMPLETED',
                'completed_at' => now(),
            ]);

            $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);

            return $pickingList;
        });
    }

    /**
     * Delete a Picking List.
     *
     * @param PickingList $pickingList
     * @return void
     * @throws \Exception
     */
    public function deletePickingList(PickingList $pickingList): void
    {
        DB::transaction(function () use ($pickingList) {
            if ($pickingList->status === 'COMPLETED') {
                throw new \Exception('Cannot delete completed Picking List.');
            }

            $pickingList->salesOrder->update(['status' => 'PENDING']);

            $pickingList->delete();
        });
    }

    /**
     * Get warehouse code based on user role for picking lists.
     *
     * @param User $user
     * @return int
     */
    private function getUserWarehouseIdForPicking(User $user): int
    {
        // Check if user has a specific warehouse assignment
        if ($user->warehouse_id) {
            return $user->warehouse_id;
        }

        // Check if user can access all warehouses, default to MKS
        if ($user->canAccessAllWarehouses()) {
            return config('inventory.warehouses.mks', 2);
        }

        // Check role-based defaults
        if ($user->role) {
            switch ($user->role->name) {
                case config('inventory.roles.warehouse_manager_jkt'):
                    return config('inventory.warehouses.jkt', 1);
                case config('inventory.roles.warehouse_manager_mks'):
                    return config('inventory.warehouses.mks', 2);
                case config('inventory.roles.super_admin'):
                case config('inventory.roles.admin'):
                    return config('inventory.warehouses.mks', 2);
                case config('inventory.roles.warehouse_staff'):
                    return $user->warehouse_id ?: config('inventory.warehouses.mks', 2);
            }
        }

        return config('inventory.warehouses.mks', 2);
    }
}
