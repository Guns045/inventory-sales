<?php

namespace App\Services;

use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Quotation;
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
}
