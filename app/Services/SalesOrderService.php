<?php

namespace App\Services;

use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Product;
use App\Models\Quotation;
use App\Traits\DocumentNumberHelper;
use Illuminate\Support\Facades\DB;
use App\Models\ActivityLog;

class SalesOrderService
{
    use DocumentNumberHelper;

    protected $productStockService;

    public function __construct(ProductStockService $productStockService)
    {
        $this->productStockService = $productStockService;
    }

    /**
     * Create a new Sales Order
     *
     * @param array $data
     * @return SalesOrder
     * @throws \Exception
     */
    public function createSalesOrder(array $data): SalesOrder
    {
        return DB::transaction(function () use ($data) {
            // Determine warehouse ID
            // Default to MKS (2) if not specified or logic needed
            // Ideally should come from user or context
            $warehouseId = config('inventory.warehouses.mks', 2);
            if (auth()->check() && auth()->user()->warehouse_id) {
                $warehouseId = auth()->user()->warehouse_id;
            }

            $salesOrderNumber = $this->generateSalesOrderNumber($warehouseId);

            $salesOrder = SalesOrder::create([
                'sales_order_number' => $salesOrderNumber,
                'quotation_id' => $data['quotation_id'] ?? null,
                'customer_id' => $data['customer_id'],
                'user_id' => auth()->id(),
                'warehouse_id' => $warehouseId,
                'status' => $data['status'] ?? 'PENDING',
                'notes' => $data['notes'] ?? null,
                'total_amount' => 0, // Will be calculated
            ]);

            $totalAmount = 0;

            // If created from Quotation
            if (isset($data['quotation_id'])) {
                $quotation = Quotation::with('items')->findOrFail($data['quotation_id']);

                foreach ($quotation->items as $qItem) {
                    $itemTotal = $qItem->quantity * $qItem->unit_price;
                    // Apply discount/tax if needed (simplified here, assuming stored in item)
                    // Note: SalesOrderItem structure might differ slightly or need calculation

                    SalesOrderItem::create([
                        'sales_order_id' => $salesOrder->id,
                        'product_id' => $qItem->product_id,
                        'quantity' => $qItem->quantity,
                        'unit_price' => $qItem->unit_price,
                        'discount_percentage' => $qItem->discount_percentage,
                        'tax_rate' => $qItem->tax_rate,
                        // 'total_price' => ... 
                    ]);

                    // Reserve Stock
                    $this->productStockService->reserveStock(
                        $qItem->product_id,
                        $warehouseId,
                        $qItem->quantity,
                        'App\Models\SalesOrder',
                        $salesOrder->id
                    );

                    // Recalculate total logic should be robust
                    $totalAmount += $itemTotal; // Simplified
                }

                // Update Quotation status
                $quotation->update(['status' => 'CONVERTED']); // Or similar status
            } elseif (isset($data['items'])) {
                // Created manually
                foreach ($data['items'] as $item) {
                    SalesOrderItem::create([
                        'sales_order_id' => $salesOrder->id,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'discount_percentage' => $item['discount_percentage'] ?? 0,
                        'tax_rate' => $item['tax_rate'] ?? 0,
                    ]);

                    // Reserve Stock
                    $this->productStockService->reserveStock(
                        $item['product_id'],
                        $warehouseId,
                        $item['quantity'],
                        'App\Models\SalesOrder',
                        $salesOrder->id
                    );

                    $totalAmount += $item['quantity'] * $item['unit_price'];
                }
            }

            $salesOrder->update(['total_amount' => $totalAmount]);

            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Created Sales Order',
                'description' => "Created SO {$salesOrderNumber}",
                'reference_type' => 'SalesOrder',
                'reference_id' => $salesOrder->id,
            ]);

            return $salesOrder->load(['customer', 'items.product']);
        });
    }

    /**
     * Update a Sales Order
     *
     * @param SalesOrder $salesOrder
     * @param array $data
     * @return SalesOrder
     * @throws \Exception
     */
    public function updateSalesOrder(SalesOrder $salesOrder, array $data): SalesOrder
    {
        return DB::transaction(function () use ($salesOrder, $data) {
            $salesOrder->update([
                'customer_id' => $data['customer_id'] ?? $salesOrder->customer_id,
                'status' => $data['status'] ?? $salesOrder->status,
                'notes' => $data['notes'] ?? $salesOrder->notes,
            ]);

            // Handle items update if provided (usually complex: delete/re-create or sync)
            // For now, assuming basic field updates. 
            // If items are passed, we might need to replace them.

            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Updated Sales Order',
                'description' => "Updated SO {$salesOrder->sales_order_number}",
                'reference_type' => 'SalesOrder',
                'reference_id' => $salesOrder->id,
            ]);

            return $salesOrder->load(['customer', 'items.product']);
        });
    }

    /**
     * Update Sales Order status.
     *
     * @param SalesOrder $salesOrder
     * @param string $status
     * @return SalesOrder
     */
    public function updateStatus(SalesOrder $salesOrder, string $status): SalesOrder
    {
        return DB::transaction(function () use ($salesOrder, $status) {
            $oldStatus = $salesOrder->status;

            // If cancelling, release stock
            if ($status === 'CANCELLED' && $oldStatus !== 'CANCELLED') {
                // Only release stock if it was reserved (not yet shipped/deducted)
                if (in_array($oldStatus, ['PENDING', 'PROCESSING', 'READY_TO_SHIP'])) {
                    foreach ($salesOrder->items as $item) {
                        $this->productStockService->releaseStock(
                            $item->product_id,
                            $salesOrder->warehouse_id,
                            $item->quantity
                        );
                    }
                }
            }

            $salesOrder->update(['status' => $status]);

            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Updated SO Status',
                'description' => "Changed SO {$salesOrder->sales_order_number} status to {$status}",
                'reference_type' => 'SalesOrder',
                'reference_id' => $salesOrder->id,
            ]);

            return $salesOrder;
        });
    }
}
