<?php

namespace App\Services;

use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DamageReportService
{
    /**
     * Report damaged stock - move from available to damaged
     */
    public function reportDamage(int $productId, int $warehouseId, int $quantity, string $reason, ?string $notes = null, ?string $referenceNumber = null)
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $reason, $notes, $referenceNumber) {
            // Get product stock record
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                throw new \Exception('Product stock not found for this warehouse');
            }

            // Validate sufficient available stock
            if ($productStock->available_quantity < $quantity) {
                throw new \Exception("Insufficient available stock. Available: {$productStock->available_quantity}, Requested: {$quantity}");
            }

            // Update stock quantities
            $previousAvailable = $productStock->available_quantity;
            $previousDamaged = $productStock->damaged_quantity;

            $productStock->available_quantity -= $quantity;
            $productStock->damaged_quantity += $quantity;
            $productStock->save();

            // Create stock movement record
            $movement = StockMovement::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'DAMAGE',
                'quantity_change' => -$quantity, // Negative because reducing available
                'previous_quantity' => $previousAvailable,
                'new_quantity' => $productStock->available_quantity,
                'new_quantity' => $productStock->available_quantity,
                // 'movement_date' => now(), // Removed: Column does not exist, use created_at
                'reference_type' => 'DAMAGE_REPORT',
                'reference_number' => $referenceNumber,
                'created_by' => Auth::id(),
                'notes' => "Damage Report: {$reason}. " . ($notes ?? ''),
            ]);

            return [
                'success' => true,
                'product_stock' => $productStock->fresh(),
                'movement' => $movement,
                'message' => "Successfully reported {$quantity} damaged items"
            ];
        });
    }

    /**
     * Reverse damage report (for corrections/mistakes)
     */
    public function reverseDamage(int $productId, int $warehouseId, int $quantity, ?string $notes = null)
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $notes) {
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                throw new \Exception('Product stock not found');
            }

            // Validate sufficient damaged stock to reverse
            if ($productStock->damaged_quantity < $quantity) {
                throw new \Exception("Insufficient damaged stock to reverse. Damaged: {$productStock->damaged_quantity}, Requested: {$quantity}");
            }

            // Update stock quantities (reverse the damage)
            $previousAvailable = $productStock->available_quantity;

            $productStock->damaged_quantity -= $quantity;
            $productStock->available_quantity += $quantity;
            $productStock->save();

            // Create stock movement record
            $movement = StockMovement::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'DAMAGE_REVERSAL',
                'quantity_change' => $quantity, // Positive because adding back to available
                'previous_quantity' => $previousAvailable,
                'new_quantity' => $productStock->available_quantity,
                'new_quantity' => $productStock->available_quantity,
                // 'movement_date' => now(), // Removed: Column does not exist, use created_at
                'reference_type' => 'DAMAGE_REVERSAL',
                'created_by' => Auth::id(),
                'notes' => "Damage Reversal: " . ($notes ?? 'Correction'),
            ]);

            return [
                'success' => true,
                'product_stock' => $productStock->fresh(),
                'movement' => $movement,
                'message' => "Successfully reversed {$quantity} damaged items"
            ];
        });
    }

    /**
     * Dispose damaged stock (remove from inventory entirely)
     */
    public function disposeDamaged(int $productId, int $warehouseId, int $quantity, ?string $notes = null, ?string $referenceNumber = null)
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $notes, $referenceNumber) {
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                throw new \Exception('Product stock not found');
            }

            // Validate sufficient damaged stock to dispose
            if ($productStock->damaged_quantity < $quantity) {
                throw new \Exception("Insufficient damaged stock to dispose. Damaged: {$productStock->damaged_quantity}, Requested: {$quantity}");
            }

            // Update stock quantities (remove from both damaged and total)
            $previousTotal = $productStock->quantity;

            $productStock->damaged_quantity -= $quantity;
            $productStock->quantity -= $quantity; // Also reduce total inventory
            $productStock->save();

            // Create stock movement record
            $movement = StockMovement::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'DISPOSAL',
                'quantity_change' => -$quantity,
                'previous_quantity' => $previousTotal,
                'new_quantity' => $productStock->quantity,
                'new_quantity' => $productStock->quantity,
                // 'movement_date' => now(), // Removed: Column does not exist, use created_at
                'reference_type' => 'DAMAGE_DISPOSAL',
                'reference_number' => $referenceNumber,
                'created_by' => Auth::id(),
                'notes' => "Damaged Stock Disposal: " . ($notes ?? ''),
            ]);

            return [
                'success' => true,
                'product_stock' => $productStock->fresh(),
                'movement' => $movement,
                'message' => "Successfully disposed {$quantity} damaged items"
            ];
        });
    }

    /**
     * Get damage report with filters
     */
    public function getDamageReport(array $filters = [])
    {
        $query = StockMovement::with(['product', 'warehouse', 'user'])
            ->whereIn('type', ['DAMAGE', 'DAMAGE_REVERSAL', 'DISPOSAL']);

        // Filter by date range
        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        // Filter by product
        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }

        // Filter by warehouse
        if (!empty($filters['warehouse_id'])) {
            $query->where('warehouse_id', $filters['warehouse_id']);
        }

        // Filter by type
        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        // Search
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($productQuery) use ($search) {
                        $productQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $filters['per_page'] ?? 50;

        return $query->orderBy('created_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get damage statistics
     */
    public function getDamageStats(array $filters = [])
    {
        // Total damaged items currently in inventory
        $totalDamagedQuery = ProductStock::query();

        if (!empty($filters['warehouse_id'])) {
            $totalDamagedQuery->where('warehouse_id', $filters['warehouse_id']);
        }

        $totalDamaged = $totalDamagedQuery->sum('damaged_quantity');

        // Total value of damaged stock
        $damagedValue = ProductStock::join('products', 'product_stock.product_id', '=', 'products.id')
            ->selectRaw('SUM(product_stock.damaged_quantity * products.buy_price) as total_value')
            ->when(!empty($filters['warehouse_id']), function ($q) use ($filters) {
                return $q->where('product_stock.warehouse_id', $filters['warehouse_id']);
            })
            ->value('total_value') ?? 0;

        // Damage movements in date range
        $damageMovementsQuery = StockMovement::where('type', 'DAMAGE');

        if (!empty($filters['date_from'])) {
            $damageMovementsQuery->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $damageMovementsQuery->whereDate('created_at', '<=', $filters['date_to']);
        }

        $totalDamageReports = $damageMovementsQuery->count();
        $totalDamagedInPeriod = abs($damageMovementsQuery->sum('quantity_change'));

        return [
            'total_damaged_items' => $totalDamaged,
            'total_damaged_value' => $damagedValue,
            'total_damage_reports' => $totalDamageReports,
            'total_damaged_in_period' => $totalDamagedInPeriod,
        ];
    }
}
