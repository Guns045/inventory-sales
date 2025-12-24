<?php

namespace App\Services;

use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\SalesOrder;
use App\Models\ProductStock;
use App\Traits\DocumentNumberHelper;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\DeliveryOrder;

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

            if (!in_array($salesOrder->status, ['PENDING', 'PROCESSING'])) {
                throw new \Exception('Sales Order is not in PENDING or PROCESSING status.');
            }

            $existingPickingList = PickingList::where('sales_order_id', $salesOrder->id)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->first();

            if ($existingPickingList) {
                throw new \Exception('Picking List already exists for this Sales Order.');
            }

            // Use Sales Order warehouse ID to ensure consistency
            $warehouseId = $salesOrder->warehouse_id;

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
                    'location_code' => $productStock?->bin_location ?? $item->product->location_code ?? null,
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
     * Create a new Picking List from a Delivery Order.
     *
     * @param int $deliveryOrderId
     * @param User $user
     * @param string|null $notes
     * @return PickingList
     * @throws \Exception
     */
    public function createFromDeliveryOrder(int $deliveryOrderId, User $user, ?string $notes = null): PickingList
    {
        return DB::transaction(function () use ($deliveryOrderId, $user, $notes) {
            $deliveryOrder = DeliveryOrder::with(['deliveryOrderItems.product', 'salesOrder'])->findOrFail($deliveryOrderId);

            if ($deliveryOrder->status !== 'PREPARING') {
                throw new \Exception('Delivery Order must be in PREPARING status to create a Picking List.');
            }

            if ($deliveryOrder->picking_list_id) {
                throw new \Exception('Picking List already exists for this Delivery Order.');
            }

            // Use Delivery Order warehouse ID
            $warehouseId = $deliveryOrder->warehouse_id;

            $pickingList = PickingList::create([
                'picking_list_number' => $this->generatePickingListNumber($warehouseId),
                'sales_order_id' => $deliveryOrder->sales_order_id,
                'user_id' => $user->id,
                'status' => 'READY',
                'notes' => $notes,
                'warehouse_id' => $warehouseId,
            ]);

            foreach ($deliveryOrder->deliveryOrderItems as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)
                    ->where('warehouse_id', $warehouseId)
                    ->first();

                PickingListItem::create([
                    'picking_list_id' => $pickingList->id,
                    'product_id' => $item->product_id,
                    'warehouse_id' => $warehouseId,
                    'location_code' => $productStock?->bin_location ?? $item->location_code ?? null,
                    'quantity_required' => $item->quantity_shipped,
                    'quantity_picked' => 0,
                    'status' => 'PENDING',
                ]);
            }

            // Link DO to PL
            $deliveryOrder->update(['picking_list_id' => $pickingList->id]);

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
     * Generate PDF for Picking List.
     *
     * @param PickingList $pickingList
     * @return \Barryvdh\DomPDF\PDF
     */
    public function generatePDF(PickingList $pickingList)
    {
        $pickingList->load(['salesOrder.customer', 'items.product', 'user', 'warehouse']);

        // AUTO-FIX: Refresh item locations from ProductStock
        // This ensures that if ProductStock locations change (or were initially wrong), the PL is updated.
        // Only do this if status is not COMPLETED/CANCELLED to preserve history for finished orders.
        if (!in_array($pickingList->status, ['COMPLETED', 'CANCELLED'])) {
            foreach ($pickingList->items as $item) {
                $warehouseId = $pickingList->salesOrder?->warehouse_id ?? $pickingList->warehouse_id;
                $productStock = \App\Models\ProductStock::where('product_id', $item->product_id)
                    ->where('warehouse_id', $warehouseId) // Match SO warehouse or PL warehouse
                    ->first();

                if ($productStock && $productStock->bin_location) {
                    $item->update(['location_code' => $productStock->bin_location]);
                }
            }

            // AUTO-FIX: Correct Picking List Number if Warehouse Code mismatches
            // e.g. PL-004/MKS/11-2025 but SO is JKT -> PL-004/JKT/11-2025
            $soWarehouse = $pickingList->salesOrder?->warehouse;
            if ($soWarehouse) {
                $warehouseCode = $soWarehouse->code ?? ($soWarehouse->id == 1 ? 'JKT' : 'MKS'); // Fallback if code missing

                $parts = explode('/', $pickingList->picking_list_number);
                if (count($parts) >= 3) {
                    $currentCode = $parts[1];
                    if ($currentCode !== $warehouseCode) {
                        $parts[1] = $warehouseCode;
                        $newNumber = implode('/', $parts);

                        // Check uniqueness before updating
                        if (!\App\Models\PickingList::where('picking_list_number', $newNumber)->exists()) {
                            $pickingList->update(['picking_list_number' => $newNumber]);
                        }
                    }
                }
            }

            // Reload relationships after updates
            $pickingList->refresh();
            $pickingList->load(['salesOrder.customer', 'items.product', 'user', 'warehouse']);
        }

        $companyData = \App\Transformers\PickingListTransformer::getCompanyData();
        $pickingListData = \App\Transformers\PickingListTransformer::transform($pickingList);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.picking-list', [
            'company' => $companyData,
            'pl' => $pickingListData
        ]);

        return $pdf;
    }

    /**
     * Generate PDF for Warehouse Transfer.
     *
     * @param \App\Models\WarehouseTransfer $transfer
     * @return array
     */
    public function generatePDFFromTransfer(\App\Models\WarehouseTransfer $transfer)
    {
        // Try to find existing Picking List for this transfer
        $pickingList = PickingList::where('notes', 'LIKE', "%{$transfer->transfer_number}%")->first();

        // If we found the real PL, pass its number to avoid generating a new one
        $existingNumber = $pickingList ? $pickingList->picking_list_number : null;

        $data = \App\Transformers\PickingListTransformer::transformFromWarehouseTransfer($transfer, $existingNumber);

        // If we found the real PL, override other fields if needed
        if ($pickingList) {
            $data['status'] = $pickingList->status;
            $data['picker'] = $pickingList->user->name ?? $data['picker'];
        }

        $companyData = \App\Transformers\PickingListTransformer::getCompanyData();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.picking-list', [
            'company' => $companyData,
            'pl' => $data
        ]);

        return [
            'pdf_content' => base64_encode($pdf->output()),
            'filename' => 'PickingList-' . $data['PL'] . '.pdf',
            'picking_list_number' => $data['PL']
        ];
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
