<?php

namespace App\Services;

use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Log;

class InventoryService
{
    /**
     * Reserve stock for a product across multiple warehouses
     *
     * @param int $productId
     * @param int $quantity
     * @param Quotation $quotation
     * @return array List of reservations made
     * @throws \Exception
     */
    public function reserveStock(int $productId, int $quantity, Quotation $quotation): array
    {
        $remainingQuantity = $quantity;
        $stockReservations = [];

        // Get all warehouses with available stock for this product, ordered by available quantity
        $productStocks = ProductStock::where('product_id', $productId)
            ->whereRaw('(quantity - reserved_quantity) > 0')
            ->orderByRaw('(quantity - reserved_quantity) DESC')
            ->get();

        // Calculate total available stock properly
        $totalAvailableStock = 0;
        foreach ($productStocks as $stock) {
            $totalAvailableStock += ($stock->quantity - $stock->reserved_quantity);
        }

        if ($totalAvailableStock < $quantity) {
            throw new \Exception("Insufficient stock for product ID {$productId}. Total Available: {$totalAvailableStock}, Required: {$quantity}");
        }

        // Reserve stock from warehouses with available inventory
        foreach ($productStocks as $productStock) {
            if ($remainingQuantity <= 0)
                break;

            $availableInWarehouse = $productStock->quantity - $productStock->reserved_quantity;
            $reserveFromWarehouse = min($remainingQuantity, $availableInWarehouse);

            if ($reserveFromWarehouse > 0) {
                // Reserve the stock in this warehouse
                $productStock->increment('reserved_quantity', $reserveFromWarehouse);

                $stockReservations[] = [
                    'warehouse_id' => $productStock->warehouse_id,
                    'quantity_reserved' => $reserveFromWarehouse
                ];

                // Log the stock movement for this warehouse
                StockMovement::create([
                    'product_id' => $productId,
                    'warehouse_id' => $productStock->warehouse_id,
                    'type' => 'RESERVATION',
                    'quantity_change' => -$reserveFromWarehouse,
                    'reference_id' => $quotation->id,
                    'reference_type' => Quotation::class,
                    'notes' => "Stock reserved for Sales Order conversion from Quotation #{$quotation->quotation_number} (Warehouse: {$productStock->warehouse->name})",
                ]);

                $remainingQuantity -= $reserveFromWarehouse;
            }
        }

        return $stockReservations;
    }

    /**
     * Check if stock is available for a list of items
     *
     * @param iterable $items Collection of items with product_id and quantity
     * @return bool
     */
    public function checkStockAvailability($items): bool
    {
        foreach ($items as $item) {
            // Check total available stock across ALL warehouses using raw SQL
            $totalAvailableStock = ProductStock::where('product_id', $item->product_id)
                ->selectRaw('SUM(quantity - reserved_quantity) as available')
                ->value('available') ?? 0;

            // If total available stock is less than required quantity
            if ($totalAvailableStock < $item->quantity) {
                // Log detailed information for debugging
                Log::error("Stock shortage for Product ID: {$item->product_id}");
                Log::error("Required Quantity: {$item->quantity}");
                Log::error("Available Stock: {$totalAvailableStock}");
                Log::error("Shortage: " . ($item->quantity - $totalAvailableStock));

                return false;
            }
        }

        return true;
    }

    /**
     * Get detailed stock information for a product
     *
     * @param int $productId
     * @return array
     */
    public function getStockDetails(int $productId): array
    {
        $totalAvailable = ProductStock::where('product_id', $productId)
            ->selectRaw('SUM(quantity - reserved_quantity) as available')
            ->value('available') ?? 0;

        $warehouseStocks = ProductStock::where('product_id', $productId)
            ->with('warehouse')
            ->get()
            ->map(function ($stock) {
                return [
                    'warehouse_name' => $stock->warehouse->name,
                    'quantity' => $stock->quantity,
                    'reserved_quantity' => $stock->reserved_quantity,
                    'available' => $stock->quantity - $stock->reserved_quantity
                ];
            });

        return [
            'total_available' => $totalAvailable,
            'warehouse_stocks' => $warehouseStocks
        ];
    }
    /**
     * Deduct stock for a Sales Order (when shipped/completed)
     *
     * @param SalesOrder $salesOrder
     * @param int $userId
     * @return array
     * @throws \Exception
     */
    public function deductStockForSalesOrder(SalesOrder $salesOrder, int $userId): array
    {
        if ($salesOrder->status !== 'SHIPPED') {
            throw new \Exception('Sales Order must be in SHIPPED status to deduct stock.');
        }

        $stockMovements = [];

        foreach ($salesOrder->items as $item) {
            $productStock = ProductStock::where('product_id', $item->product_id)->first();

            if (!$productStock) {
                throw new \Exception("No stock record found for product ID: {$item->product_id}");
            }

            // Calculate actual quantity to deduct
            $actualQuantity = min($item->quantity, $productStock->quantity);

            if ($actualQuantity > 0) {
                // Update stock quantities
                $newQuantity = $productStock->quantity - $actualQuantity;
                $newReserved = max(0, $productStock->reserved_quantity - $actualQuantity);

                $productStock->update([
                    'quantity' => $newQuantity,
                    'reserved_quantity' => $newReserved,
                ]);

                // Create stock movement record
                $stockMovement = StockMovement::create([
                    'product_id' => $item->product_id,
                    'warehouse_id' => $productStock->warehouse_id,
                    'type' => 'OUT',
                    'quantity_change' => -$actualQuantity,
                    'previous_quantity' => $productStock->quantity + $actualQuantity,
                    'new_quantity' => $newQuantity,
                    'reference_type' => 'SalesOrder',
                    'reference_id' => $salesOrder->id,
                    'reference_number' => $salesOrder->sales_order_number,
                    'created_by' => $userId,
                    'notes' => "Stock deducted for Sales Order {$salesOrder->sales_order_number}",
                ]);

                $stockMovements[] = $stockMovement;
            }
        }

        // Update sales order status to COMPLETED
        $salesOrder->update(['status' => 'COMPLETED']);

        // Log activity
        ActivityLog::create([
            'user_id' => $userId,
            'action' => 'Deducted Stock', // Standardized action name
            'description' => 'Deducted stock for Sales Order ' . $salesOrder->sales_order_number,
            'reference_type' => 'SalesOrder', // Standardized reference type
            'reference_id' => $salesOrder->id,
        ]);

        return $stockMovements;
    }

    /**
     * Reserve stock for a Sales Order
     *
     * @param SalesOrder $salesOrder
     * @param int $userId
     * @return void
     * @throws \Exception
     */
    public function reserveStockForSalesOrder(SalesOrder $salesOrder, int $userId): void
    {
        if ($salesOrder->status !== 'PENDING') {
            throw new \Exception('Sales Order must be in PENDING status to reserve stock.');
        }

        foreach ($salesOrder->items as $item) {
            $productStock = ProductStock::where('product_id', $item->product_id)->first();

            if (!$productStock) {
                throw new \Exception("No stock record found for product ID: {$item->product_id}");
            }

            // Calculate reserved quantity
            $availableQuantity = $productStock->quantity - $productStock->reserved_quantity;
            $reserveQuantity = min($item->quantity, $availableQuantity);

            if ($reserveQuantity > 0) {
                $productStock->increment('reserved_quantity', $reserveQuantity);

                // Log stock reservation
                StockMovement::create([
                    'product_id' => $item->product_id,
                    'warehouse_id' => $productStock->warehouse_id,
                    'type' => 'RESERVATION',
                    'quantity_change' => $reserveQuantity,
                    'previous_quantity' => $productStock->reserved_quantity - $reserveQuantity,
                    'new_quantity' => $productStock->reserved_quantity,
                    'reference_type' => 'SalesOrder',
                    'reference_id' => $salesOrder->id,
                    'reference_number' => $salesOrder->sales_order_number,
                    'created_by' => $userId,
                    'notes' => "Stock reserved for Sales Order {$salesOrder->sales_order_number}",
                ]);
            }
        }
    }
    /**
     * Get available stock for a product in a specific warehouse
     *
     * @param int $productId
     * @param int $warehouseId
     * @return int
     */
    public function getAvailableStock(int $productId, int $warehouseId): int
    {
        $stock = ProductStock::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        if (!$stock) {
            return 0;
        }

        return max(0, $stock->quantity - $stock->reserved_quantity);
    }

    /**
     * Reduce stock from a warehouse
     *
     * @param int $productId
     * @param int $warehouseId
     * @param int $quantity
     * @param string $notes
     * @param int|null $referenceId
     * @param string|null $referenceType
     * @return void
     * @throws \Exception
     */
    public function reduceStock(int $productId, int $warehouseId, int $quantity, string $notes, $referenceId = null, $referenceType = null): void
    {
        $stock = ProductStock::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        if (!$stock) {
            throw new \Exception("Stock record not found for product {$productId} in warehouse {$warehouseId}");
        }

        if (($stock->quantity - $stock->reserved_quantity) < $quantity) {
            throw new \Exception("Insufficient available stock. Available: " . ($stock->quantity - $stock->reserved_quantity));
        }

        $previousQuantity = $stock->quantity;
        $stock->decrement('quantity', $quantity);

        StockMovement::create([
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'type' => 'OUT',
            'quantity_change' => -$quantity,
            'previous_quantity' => $previousQuantity,
            'new_quantity' => $stock->quantity,
            'notes' => $notes,
            'reference_id' => $referenceId,
            'reference_type' => $referenceType,
            'created_by' => auth()->id() ?? 1, // Fallback to 1 if no user (e.g. seeder/job)
        ]);
    }

    /**
     * Add stock to a warehouse
     *
     * @param int $productId
     * @param int $warehouseId
     * @param int $quantity
     * @param string $notes
     * @param int|null $referenceId
     * @param string|null $referenceType
     * @return void
     */
    public function addStock(int $productId, int $warehouseId, int $quantity, string $notes, $referenceId = null, $referenceType = null): void
    {
        $stock = ProductStock::firstOrCreate(
            ['product_id' => $productId, 'warehouse_id' => $warehouseId],
            ['quantity' => 0, 'reserved_quantity' => 0, 'aisle' => 'A', 'rack' => '1', 'shelf' => '1', 'bin' => '1']
        );

        $previousQuantity = $stock->quantity;
        $stock->increment('quantity', $quantity);

        StockMovement::create([
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'type' => 'IN',
            'quantity_change' => $quantity,
            'previous_quantity' => $previousQuantity,
            'new_quantity' => $stock->quantity,
            'notes' => $notes,
            'reference_id' => $referenceId,
            'reference_type' => $referenceType,
            'created_by' => auth()->id() ?? 1,
        ]);
    }
}
