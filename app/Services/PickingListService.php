<?php

namespace App\Services;

use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\SalesOrder;
use App\Models\ProductStock;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\WarehouseTransfer;
use App\Transformers\PickingListTransformer;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class PickingListService
{
    /**
     * Create a picking list from a sales order
     *
     * @param int $salesOrderId
     * @param string|null $notes
     * @return PickingList
     * @throws \Exception
     */
    public function createFromSalesOrder(int $salesOrderId, ?string $notes = null): PickingList
    {
        return DB::transaction(function () use ($salesOrderId, $notes) {
            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($salesOrderId);

            if ($salesOrder->status !== 'PENDING') {
                throw new \Exception('Sales Order is not in PENDING status.');
            }

            $existingPickingList = PickingList::where('sales_order_id', $salesOrderId)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->first();

            if ($existingPickingList) {
                throw new \Exception('Picking List already exists for this Sales Order.');
            }

            $pickingList = PickingList::create([
                'sales_order_id' => $salesOrder->id,
                'user_id' => auth()->id(),
                'warehouse_id' => $salesOrder->warehouse_id,
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

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Created picking list ' . $pickingList->picking_list_number . ' from sales order ' . $salesOrder->sales_order_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Picking List Created',
                'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been created for Sales Order ' . $salesOrder->sales_order_number,
                'type' => 'info',
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
                'read' => false,
            ]);

            return $pickingList->load(['salesOrder.customer', 'user', 'items.product']);
        });
    }

    /**
     * Update a picking list
     *
     * @param PickingList $pickingList
     * @param array $data
     * @return PickingList
     * @throws \Exception
     */
    public function updatePickingList(PickingList $pickingList, array $data): PickingList
    {
        return DB::transaction(function () use ($pickingList, $data) {
            if (!in_array($pickingList->status, ['READY', 'PICKING'])) {
                throw new \Exception('Cannot edit Picking List in current status.');
            }

            $allCompleted = true;
            $hasUpdates = false;

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

            $newStatus = $allCompleted ? 'COMPLETED' : ($hasUpdates ? 'PICKING' : $pickingList->status);

            $pickingList->update([
                'notes' => $data['notes'] ?? $pickingList->notes,
                'status' => $newStatus,
                'completed_at' => $allCompleted ? now() : $pickingList->completed_at,
            ]);

            if ($allCompleted) {
                $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);
                $this->logCompletion($pickingList);
            }

            return $pickingList->load(['salesOrder.customer', 'user', 'items.product']);
        });
    }

    /**
     * Complete a picking list
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

            $this->logCompletion($pickingList);

            return $pickingList->load(['salesOrder.customer', 'user', 'items.product']);
        });
    }

    /**
     * Delete a picking list
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

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Deleted picking list ' . $pickingList->picking_list_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            $pickingList->delete();
        });
    }

    /**
     * Generate PDF for picking list
     *
     * @param PickingList $pickingList
     * @return mixed
     */
    public function generatePDF(PickingList $pickingList)
    {
        // Load picking list with relationships
        $pickingList->load([
            'salesOrder',
            'items.product',
            'warehouse',
            'user'
        ]);

        // Transform data
        $pickingListData = PickingListTransformer::transform($pickingList);
        $companyData = PickingListTransformer::getCompanyData();

        // Log activity
        ActivityLog::log(
            'PRINT_PICKING_LIST_PDF',
            "User printed picking list {$pickingList->picking_list_number}",
            $pickingList
        );

        // Generate PDF
        $pdf = PDF::loadView('pdf.picking-list-universal', [
            'pl' => $pickingListData,
            'source_type' => 'SO',
            'company' => $companyData
        ])->setPaper('a4', 'portrait');

        return $pdf;
    }

    /**
     * Generate PDF from Warehouse Transfer
     * 
     * @param WarehouseTransfer $transfer
     * @return array
     */
    public function generatePDFFromTransfer(WarehouseTransfer $transfer): array
    {
        // Transform data
        $plData = PickingListTransformer::transformFromWarehouseTransfer($transfer);
        $companyData = PickingListTransformer::getCompanyData();

        // Generate PDF
        $pdf = PDF::loadView('pdf.picking-list-universal', [
            'pl' => $plData,
            'source_type' => 'IT', // Internal Transfer
            'company' => $companyData
        ])->setPaper('a4', 'portrait');

        $pdfContent = $pdf->output();
        $filename = "PickingList_Transfer_" . str_replace(['/', '\\'], '_', $plData['PL']) . ".pdf";

        return [
            'picking_list_number' => $plData['PL'],
            'pdf_content' => base64_encode($pdfContent),
            'filename' => $filename
        ];
    }

    private function logCompletion(PickingList $pickingList)
    {
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'activity' => 'Completed picking list ' . $pickingList->picking_list_number,
            'module' => 'Picking List',
            'data_id' => $pickingList->id,
        ]);

        // Create notification
        Notification::create([
            'user_id' => auth()->id(),
            'title' => 'Picking List Completed',
            'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been completed and is ready to ship',
            'type' => 'success',
            'module' => 'Picking List',
            'data_id' => $pickingList->id,
            'read' => false,
        ]);
    }
}
