<?php

namespace App\Services;

use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\DocumentCounter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

class SalesReturnService
{
    protected $creditNoteService;

    public function __construct(CreditNoteService $creditNoteService)
    {
        $this->creditNoteService = $creditNoteService;
    }

    public function createReturn(array $data)
    {
        return DB::transaction(function () use ($data) {
            $salesOrder = \App\Models\SalesOrder::with('items')->findOrFail($data['sales_order_id']);

            // Validate Return Quantities
            foreach ($data['items'] as $item) {
                $originalItem = $salesOrder->items->where('product_id', $item['product_id'])->first();

                if (!$originalItem) {
                    throw new Exception("Product not found in original Sales Order.");
                }

                // Calculate total previously returned quantity for this product (excluding REJECTED)
                $returnedQuantity = SalesReturnItem::whereHas('salesReturn', function ($query) use ($salesOrder) {
                    $query->where('sales_order_id', $salesOrder->id)
                        ->where('status', '!=', 'REJECTED');
                })->where('product_id', $item['product_id'])->sum('quantity');

                $remainingQuantity = $originalItem->quantity - $returnedQuantity;

                if ($item['quantity'] > $remainingQuantity) {
                    throw new Exception("Cannot return {$item['quantity']} items. Only {$remainingQuantity} remaining for product ID {$item['product_id']}.");
                }
            }

            // Generate Return Number
            $returnNumber = DocumentCounter::getNextNumber('SALES_RETURN', $salesOrder->warehouse_id);

            $salesReturn = SalesReturn::create([
                'sales_order_id' => $data['sales_order_id'],
                'return_number' => $returnNumber,
                'status' => 'PENDING',
                'reason' => $data['reason'],
                'notes' => $data['notes'] ?? null,
                'created_by' => Auth::id(),
            ]);

            foreach ($data['items'] as $item) {
                SalesReturnItem::create([
                    'sales_return_id' => $salesReturn->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'condition' => $item['condition'] ?? 'GOOD',
                ]);
            }

            return $salesReturn;
        });
    }

    public function approveReturn(SalesReturn $salesReturn)
    {
        if ($salesReturn->status !== 'PENDING') {
            throw new Exception("Return order is not pending approval.");
        }

        return DB::transaction(function () use ($salesReturn) {
            $salesReturn->update([
                'status' => 'APPROVED',
                'approved_by' => Auth::id(),
            ]);

            // Adjust Stock
            foreach ($salesReturn->items as $item) {
                if ($item->condition === 'GOOD') {
                    $this->restockItem($item, $salesReturn);
                }
                // If DAMAGED, we might want to move it to a different warehouse or just log it without adding to available stock.
                // For now, we only restock GOOD items.
            }

            // Auto-create Credit Note
            $this->creditNoteService->createFromSalesReturn($salesReturn);

            return $salesReturn;
        });

    }

    public function rejectReturn(SalesReturn $salesReturn, string $reason = null)
    {
        if ($salesReturn->status !== 'PENDING') {
            throw new Exception("Return order is not pending approval.");
        }

        $salesReturn->update([
            'status' => 'REJECTED',
            'approved_by' => Auth::id(), // Using approved_by field to track who rejected it as well, or we could add rejected_by
            'notes' => $salesReturn->notes . ($reason ? "\nRejection Reason: " . $reason : "")
        ]);

        return $salesReturn;
    }

    private function restockItem($item, $salesReturn)
    {
        // Get Warehouse from Sales Order
        $warehouseId = $salesReturn->salesOrder->warehouse_id;

        $productStock = ProductStock::firstOrCreate(
            ['product_id' => $item->product_id, 'warehouse_id' => $warehouseId],
            ['quantity' => 0, 'reserved_quantity' => 0]
        );

        $previousQuantity = $productStock->quantity;
        $productStock->quantity += $item->quantity;
        $productStock->save();

        // Log Movement
        StockMovement::create([
            'product_id' => $item->product_id,
            'warehouse_id' => $warehouseId,
            'type' => 'IN',
            'quantity_change' => $item->quantity,
            'reference_type' => 'App\Models\SalesReturn',
            'reference_id' => $salesReturn->id,
            'notes' => "Sales Return: {$salesReturn->return_number}",
            'created_by' => Auth::id(),
            'previous_quantity' => $previousQuantity,
            'new_quantity' => $productStock->quantity
        ]);
    }


}
