<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use App\Models\ProductStock;
use App\Models\DocumentCounter;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GoodsReceiptService
{
    /**
     * Create a new Goods Receipt
     */
    public function createGoodsReceipt(array $data, int $userId): GoodsReceipt
    {
        return DB::transaction(function () use ($data, $userId) {
            // Generate GR number
            $grNumber = DocumentCounter::getNextNumber('GOODS_RECEIPT', $data['warehouse_id']);

            $goodsReceipt = GoodsReceipt::create([
                'receipt_number' => $grNumber,
                'purchase_order_id' => $data['purchase_order_id'],
                'warehouse_id' => $data['warehouse_id'],
                'user_id' => $userId,
                'received_by' => $userId,
                'status' => 'PENDING',
                'receipt_date' => $data['received_date'],
                'notes' => $data['notes'] ?? null,
                'total_amount' => 0, // Will be updated after adding items
            ]);

            $totalAmount = 0;
            foreach ($data['items'] as $itemData) {
                $lineTotal = $itemData['quantity_received'] * $itemData['unit_price'];
                $totalAmount += $lineTotal;

                GoodsReceiptItem::create([
                    'goods_receipt_id' => $goodsReceipt->id,
                    'purchase_order_item_id' => $itemData['purchase_order_item_id'],
                    'product_id' => $itemData['product_id'],
                    'quantity_ordered' => $itemData['quantity_ordered'],
                    'quantity_received' => $itemData['quantity_received'],
                    'unit_price' => $itemData['unit_price'],
                    'line_total' => $lineTotal,
                    'condition' => $itemData['condition'],
                    'batch_number' => $itemData['batch_number'] ?? null,
                    'expiry_date' => $itemData['expiry_date'] ?? null,
                ]);
            }

            $goodsReceipt->update(['total_amount' => $totalAmount]);

            ActivityLog::log(
                'Created Goods Receipt',
                "Created GR {$grNumber} for PO {$goodsReceipt->purchaseOrder->po_number}",
                $goodsReceipt
            );

            return $goodsReceipt->load(['purchaseOrder.supplier', 'warehouse', 'items.product']);
        });
    }

    /**
     * Update an existing Goods Receipt
     */
    public function updateGoodsReceipt(GoodsReceipt $goodsReceipt, array $data): GoodsReceipt
    {
        if ($goodsReceipt->status !== 'PENDING') {
            throw new \Exception('Only pending goods receipts can be edited');
        }

        return DB::transaction(function () use ($goodsReceipt, $data) {
            $goodsReceipt->update([
                'received_date' => $data['received_date'],
                'notes' => $data['notes'] ?? $goodsReceipt->notes,
            ]);

            // Delete existing items
            $goodsReceipt->items()->delete();

            $totalAmount = 0;
            foreach ($data['items'] as $itemData) {
                $lineTotal = $itemData['quantity_received'] * $itemData['unit_price'];
                $totalAmount += $lineTotal;

                GoodsReceiptItem::create([
                    'goods_receipt_id' => $goodsReceipt->id,
                    'purchase_order_item_id' => $itemData['purchase_order_item_id'],
                    'product_id' => $itemData['product_id'],
                    'quantity_ordered' => $itemData['quantity_ordered'],
                    'quantity_received' => $itemData['quantity_received'],
                    'unit_price' => $itemData['unit_price'],
                    'line_total' => $lineTotal,
                    'condition' => $itemData['condition'],
                    'batch_number' => $itemData['batch_number'] ?? null,
                    'expiry_date' => $itemData['expiry_date'] ?? null,
                ]);
            }

            $goodsReceipt->update(['total_amount' => $totalAmount]);

            ActivityLog::log(
                'Updated Goods Receipt',
                "Updated GR {$goodsReceipt->receipt_number}",
                $goodsReceipt
            );

            return $goodsReceipt->refresh()->load(['purchaseOrder.supplier', 'warehouse', 'items.product']);
        });
    }

    /**
     * Delete a Goods Receipt
     */
    public function deleteGoodsReceipt(GoodsReceipt $goodsReceipt): void
    {
        if ($goodsReceipt->status !== 'PENDING') {
            throw new \Exception('Only pending goods receipts can be deleted');
        }

        DB::transaction(function () use ($goodsReceipt) {
            $goodsReceipt->items()->delete();

            ActivityLog::log(
                'Deleted Goods Receipt',
                "Deleted GR {$goodsReceipt->receipt_number}",
                $goodsReceipt
            );

            $goodsReceipt->delete();
        });
    }

    /**
     * Process (Receive) a Goods Receipt
     */
    public function processGoodsReceipt(GoodsReceipt $goodsReceipt, ?string $notes = null, int $userId): GoodsReceipt
    {
        if ($goodsReceipt->status !== 'PENDING') {
            throw new \Exception('Only pending goods receipts can be received');
        }

        return DB::transaction(function () use ($goodsReceipt, $notes, $userId) {
            if ($notes) {
                $goodsReceipt->notes = $notes;
            }

            foreach ($goodsReceipt->items as $item) {
                if ($item->condition === 'GOOD') {
                    // Update product stock
                    $productStock = ProductStock::firstOrCreate(
                        [
                            'product_id' => $item->product_id,
                            'warehouse_id' => $goodsReceipt->warehouse_id,
                        ],
                        ['quantity' => 0, 'reserved_quantity' => 0]
                    );

                    $productStock->quantity += $item->quantity_received;
                    $productStock->save();

                    // Update PO item received quantity
                    $poItem = PurchaseOrderItem::find($item->purchase_order_item_id);
                    if ($poItem) {
                        $poItem->quantity_received += $item->quantity_received;
                        $poItem->save();
                    }

                    // Create stock movement
                    StockMovement::create([
                        'product_id' => $item->product_id,
                        'warehouse_id' => $goodsReceipt->warehouse_id,
                        'quantity_change' => $item->quantity_received,
                        'type' => 'IN',
                        'reference_type' => 'GoodsReceipt',
                        'reference_id' => $goodsReceipt->id,
                        'notes' => "Received from PO {$goodsReceipt->purchaseOrder->po_number}",
                        'user_id' => $userId
                    ]);
                }
            }

            // Update GR status
            $this->updateGoodsReceiptStatus($goodsReceipt);

            // Update PO status
            $this->updatePurchaseOrderStatus($goodsReceipt->purchaseOrder);

            // Create notification
            Notification::create([
                'user_id' => $userId,
                'title' => 'Goods Receipt Processed',
                'message' => "GR {$goodsReceipt->receipt_number} has been processed. Status: {$goodsReceipt->status}",
                'type' => 'goods_receipt',
                'reference_id' => $goodsReceipt->id,
            ]);

            ActivityLog::log(
                'Processed Goods Receipt',
                "Processed GR {$goodsReceipt->receipt_number}. Status: {$goodsReceipt->status}",
                $goodsReceipt
            );

            return $goodsReceipt->refresh()->load(['purchaseOrder.supplier', 'warehouse', 'items.product']);
        });
    }

    /**
     * Update Goods Receipt Status based on items received
     */
    private function updateGoodsReceiptStatus(GoodsReceipt $goodsReceipt): void
    {
        $totalItems = $goodsReceipt->items->count();
        $completedItems = 0;
        $partialItems = 0;

        foreach ($goodsReceipt->items as $item) {
            if ($item->quantity_received >= $item->quantity_ordered) {
                $completedItems++;
            } elseif ($item->quantity_received > 0) {
                $partialItems++;
            }
        }

        if ($completedItems === $totalItems) {
            $goodsReceipt->status = 'RECEIVED';
        } elseif ($completedItems > 0 || $partialItems > 0) {
            $goodsReceipt->status = 'PARTIAL_RECEIVED';
        }
        // Keep PENDING if no items received (though unlikely in this flow)

        $goodsReceipt->save();
    }

    /**
     * Update Purchase Order Status based on all Goods Receipts
     */
    private function updatePurchaseOrderStatus(PurchaseOrder $purchaseOrder): void
    {
        $totalItems = $purchaseOrder->items->count();
        $completedItems = 0;
        $partialItems = 0;

        foreach ($purchaseOrder->items as $poItem) {
            // Calculate total received from ALL goods receipts for this PO item
            $totalReceived = GoodsReceiptItem::where('purchase_order_item_id', $poItem->id)
                ->whereHas('goodsReceipt', function ($query) {
                    $query->where('status', '!=', 'PENDING');
                })
                ->sum('quantity_received');

            if ($totalReceived >= $poItem->quantity_ordered) {
                $completedItems++;
            } elseif ($totalReceived > 0) {
                $partialItems++;
            }
        }

        if ($completedItems === $totalItems) {
            $purchaseOrder->status = 'COMPLETED';
        } elseif ($completedItems > 0 || $partialItems > 0) {
            $purchaseOrder->status = 'PARTIAL_RECEIVED';
        }

        $purchaseOrder->save();
    }
}
