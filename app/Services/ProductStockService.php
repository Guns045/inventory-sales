<?php

namespace App\Services;

use App\Models\ProductStock;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ProductStockService
{
    /**
     * Get stock levels with filtering and role-based access
     *
     * @param array $filters
     * @param \App\Models\User $user
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getStockLevels(array $filters, $user)
    {
        $viewMode = $filters['view_mode'] ?? 'per-warehouse';
        $search = $filters['search'] ?? '';
        $warehouseId = $filters['warehouse_id'] ?? '';
        $perPage = $filters['per_page'] ?? 10;

        $query = ProductStock::with(['product', 'warehouse']);

        // Search functionality
        if ($search) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Warehouse filter
        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        // Role-based filtering
        if ($user && $user->role->name !== 'Super Admin') {
            // Sales Team can view all warehouse stock data
            if ($user->role->name === 'Sales Team') {
                // Sales Team can see all warehouses - no warehouse filtering
            } else {
                // Filter other roles by assigned warehouse
                if ($user->warehouse_id) {
                    $query->where('warehouse_id', $user->warehouse_id);
                }
            }
        }

        if ($viewMode === 'consolidated') {
            return $this->getConsolidatedView($query, $perPage);
        } elseif ($viewMode === 'all-warehouses') {
            return $this->getAllWarehousesView($query, $perPage);
        } else {
            return $this->getPerWarehouseView($query, $perPage);
        }
    }

    /**
     * Get consolidated view (aggregated across warehouses)
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $perPage
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    private function getConsolidatedView($query, int $perPage)
    {
        $stocks = $query->selectRaw('
                product_id,
                SUM(quantity) as total_quantity,
                SUM(reserved_quantity) as total_reserved,
                SUM(quantity - reserved_quantity) as total_available,
                MIN(min_stock_level) as min_stock_level
            ')
            ->groupBy('product_id')
            ->with('product')
            ->paginate($perPage);

        // Transform data for frontend
        $data = $stocks->getCollection()->map(function ($item) {
            return [
                'id' => 'consolidated_' . $item->product_id,
                'product_id' => $item->product_id,
                'product' => $item->product,
                'warehouse' => (object) [
                    'code' => 'ALL',
                    'name' => 'All Warehouses'
                ],
                'quantity' => $item->total_quantity,
                'reserved_quantity' => $item->total_reserved,
                'min_stock_level' => $item->min_stock_level,
                'view_mode' => 'consolidated'
            ];
        });

        $stocks->setCollection($data);
        return $stocks;
    }

    /**
     * Get per-warehouse view
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $perPage
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    private function getPerWarehouseView($query, int $perPage)
    {
        $stocks = $query->paginate($perPage);

        // Add calculated available quantity
        $data = $stocks->getCollection()->map(function ($item) {
            $item->available_quantity = $item->quantity - $item->reserved_quantity;
            $item->view_mode = 'per-warehouse';
            return $item;
        });

        $stocks->setCollection($data);
        return $stocks;
    }

    /**
     * Get all warehouses view (pivot style)
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int $perPage
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    private function getAllWarehousesView($query, int $perPage)
    {
        // Group by product_id to get unique products
        // Note: We need to be careful with strict mode in MySQL. 
        // Selecting only product_id is safe with groupBy product_id.
        $stocks = $query->select('product_id')
            ->groupBy('product_id')
            ->with('product')
            ->paginate($perPage);

        // Fetch all related stocks for these products to avoid N+1
        $productIds = $stocks->pluck('product_id');
        $allStocks = ProductStock::whereIn('product_id', $productIds)
            ->with('warehouse')
            ->get()
            ->groupBy('product_id');

        // Transform data
        $data = $stocks->getCollection()->map(function ($item) use ($allStocks) {
            $productStocks = $allStocks->get($item->product_id) ?? collect();

            $item->stocks = $productStocks->values();
            $item->quantity = $productStocks->sum('quantity');
            $item->reserved_quantity = $productStocks->sum('reserved_quantity');
            $item->view_mode = 'all-warehouses';

            // Set a dummy ID to avoid issues if resource expects unique ID
            $item->id = 'pivot_' . $item->product_id;

            return $item;
        });

        $stocks->setCollection($data);
        return $stocks;
    }

    /**
     * Create a new product stock record
     *
     * @param array $data
     * @return ProductStock
     * @throws \Exception
     */
    public function createStock(array $data): ProductStock
    {
        // Check if combination already exists
        $existing = ProductStock::where('product_id', $data['product_id'])
            ->where('warehouse_id', $data['warehouse_id'])
            ->first();

        if ($existing) {
            throw new \Exception('Product stock record already exists for this product and warehouse');
        }

        return ProductStock::create($data);
    }

    /**
     * Update a product stock record
     *
     * @param ProductStock $productStock
     * @param array $data
     * @return ProductStock
     * @throws \Exception
     */
    public function updateStock(ProductStock $productStock, array $data): ProductStock
    {
        // Ensure the combination doesn't already exist for a different record
        $existing = ProductStock::where('product_id', $data['product_id'])
            ->where('warehouse_id', $data['warehouse_id'])
            ->where('id', '!=', $productStock->id)
            ->first();

        if ($existing) {
            throw new \Exception('Product stock record already exists for this product and warehouse');
        }

        $productStock->update($data);
        return $productStock;
    }

    /**
     * Delete a product stock record
     *
     * @param ProductStock $productStock
     * @return bool
     */
    public function deleteStock(ProductStock $productStock): bool
    {
        return $productStock->delete();
    }

    /**
     * Bulk delete product stock records
     *
     * @param array $ids
     * @return array
     */
    public function bulkDeleteStock(array $ids): array
    {
        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($ids as $id) {
            try {
                $stock = ProductStock::find($id);
                if (!$stock) {
                    $failCount++;
                    $errors[] = "Stock ID {$id} not found";
                    continue;
                }

                $stock->delete();
                $successCount++;
            } catch (\Exception $e) {
                $failCount++;
                $errors[] = "Failed to delete stock ID {$id}: " . $e->getMessage();
            }
        }

        return [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors
        ];
    }

    /**
     * Adjust stock quantity manually
     *
     * @param array $data
     * @return array
     * @throws \Exception
     */
    public function adjustStock(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $productStock = ProductStock::findOrFail($data['product_stock_id']);

            $quantityChange = $data['quantity'];
            if ($data['adjustment_type'] === 'decrease') {
                $quantityChange = -$quantityChange;

                // Validate sufficient stock
                if ($productStock->quantity < $data['quantity']) {
                    throw new \Exception('Insufficient stock for adjustment');
                }
            }

            // Update stock quantity
            $previousQuantity = $productStock->quantity;
            $productStock->quantity += $quantityChange;
            $productStock->save();

            // Create stock movement record
            StockMovement::create([
                'product_id' => $productStock->product_id,
                'warehouse_id' => $productStock->warehouse_id,
                'type' => $data['adjustment_type'] === 'increase' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                'quantity_change' => $quantityChange,
                'reference_type' => 'App\Models\ProductStock',
                'reference_id' => $productStock->id,
                'notes' => ($data['reason'] ?? '') . ' - ' . ($data['notes'] ?? ''),
                'created_by' => Auth::id(),
                'previous_quantity' => $previousQuantity,
                'new_quantity' => $productStock->quantity
            ]);

            Log::info('Stock adjusted', [
                'product_stock_id' => $productStock->id,
                'product_id' => $productStock->product_id,
                'warehouse_id' => $productStock->warehouse_id,
                'adjustment_type' => $data['adjustment_type'],
                'quantity' => $data['quantity'],
                'new_quantity' => $productStock->quantity
            ]);

            return [
                'success' => true,
                'message' => 'Stock adjusted successfully',
                'new_quantity' => $productStock->quantity,
                'adjustment_type' => $data['adjustment_type'],
                'quantity_changed' => $data['quantity']
            ];
        });
    }

    /**
     * Get stock movement history for a product stock
     *
     * @param int $productStockId
     * @param int $perPage
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getMovementHistory(int $productStockId, int $perPage = 50)
    {
        $productStock = ProductStock::findOrFail($productStockId);

        return StockMovement::where('product_id', $productStock->product_id)
            ->where('warehouse_id', $productStock->warehouse_id)
            ->with(['user'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
    /**
     * Reserve stock for a product
     *
     * @param int $productId
     * @param int $warehouseId
     * @param int $quantity
     * @param string $referenceType
     * @param int $referenceId
     * @return ProductStock
     * @throws \Exception
     */
    public function reserveStock(int $productId, int $warehouseId, int $quantity, string $referenceType, int $referenceId): ProductStock
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $referenceType, $referenceId) {
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                throw new \Exception("Stock record not found for product ID {$productId} in warehouse ID {$warehouseId}");
            }

            // Check available stock (quantity - reserved_quantity)
            $availableQuantity = $productStock->quantity - $productStock->reserved_quantity;
            if ($availableQuantity < $quantity) {
                throw new \Exception("Insufficient available stock for product {$productStock->product->name}. Requested: {$quantity}, Available: {$availableQuantity}");
            }

            $productStock->reserved_quantity += $quantity;
            $productStock->save();

            // Log movement (optional for reservation, but good for tracking)
            // We might not want to create a StockMovement for reservation as it doesn't change physical stock,
            // but we can log it if needed. For now, let's just log to ActivityLog via the calling service if needed.

            return $productStock;
        });
    }

    /**
     * Release reserved stock (e.g., when SO is cancelled)
     *
     * @param int $productId
     * @param int $warehouseId
     * @param int $quantity
     * @return ProductStock
     * @throws \Exception
     */
    public function releaseStock(int $productId, int $warehouseId, int $quantity): ?ProductStock
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity) {
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                // If stock record is missing during release (cancellation), it implies there was no reservation 
                // or the record was deleted. We should log this but NOT fail the cancellation.
                Log::warning("Stock record not found for product ID {$productId} in warehouse ID {$warehouseId} during release. Skipping.");
                return null;
            }

            if ($productStock->reserved_quantity < $quantity) {
                // Instead of throwing exception, we log a warning and reset to 0
                // This ensures "Safe Cancel" works even if data is slightly out of sync
                Log::warning("Attempting to release more stock than reserved. Reserved: {$productStock->reserved_quantity}, Requested: {$quantity}. Resetting to 0.");
                $productStock->reserved_quantity = 0;
            } else {
                $productStock->reserved_quantity -= $quantity;
            }
            $productStock->save();

            return $productStock;
        });
    }

    /**
     * Deduct stock (e.g., when DO is shipped)
     * This reduces both physical quantity and reserved quantity
     *
     * @param int $productId
     * @param int $warehouseId
     * @param int $quantity
     * @param string $referenceType
     * @param int $referenceId
     * @param string $notes
     * @return ProductStock
     * @throws \Exception
     */
    public function deductStock(int $productId, int $warehouseId, int $quantity, string $referenceType, int $referenceId, string $notes = ''): ProductStock
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $referenceType, $referenceId, $notes) {
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                // Treat missing record as 0 quantity
                $product = \App\Models\Product::find($productId);
                $productName = $product ? $product->name : "Product ID $productId";
                throw new \Exception("Insufficient physical stock for '{$productName}' (Record not found). Quantity: 0, Requested: {$quantity}");
            }

            // We assume the stock was already reserved, so we deduct from both.
            // If it wasn't reserved (e.g. direct invoice), we might need different logic.
            // But for the standard workflow SO -> DO, it should be reserved.

            // Check if we have enough reserved stock to deduct
            if ($productStock->reserved_quantity < $quantity) {
                // Fallback: If not enough reserved, check if we have enough physical stock at least
                // This handles cases where reservation might have been skipped or data is out of sync
                if ($productStock->quantity < $quantity) {
                    throw new \Exception("Insufficient physical stock for '{$productStock->product->name}'. Quantity: {$productStock->quantity}, Requested: {$quantity}");
                }
                // If we have physical stock but not reserved, we just deduct what we can from reserved
                // and the rest from available (implicitly). 
                // Actually, if reserved < quantity, it means we are shipping more than reserved.
                // We should just deduct quantity from quantity, and deduct quantity from reserved (clamped to 0).
                // But strictly speaking, for this workflow, we expect reserved >= quantity.

                // Let's be strict for now to catch bugs, or lenient? 
                // Given the user report "Reserved is 0", we might need to be careful.
                // If we fix the workflow, reserved should be correct.
                // Let's just deduct quantity from quantity, and quantity from reserved (min 0).
            }

            $previousQuantity = $productStock->quantity;

            $productStock->quantity -= $quantity;
            $productStock->reserved_quantity = max(0, $productStock->reserved_quantity - $quantity);
            $productStock->save();

            // Create Stock Movement
            StockMovement::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'OUT',
                'quantity_change' => -$quantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'created_by' => Auth::id(),
                'previous_quantity' => $previousQuantity,
                'new_quantity' => $productStock->quantity
            ]);

            return $productStock;
        });
    }
}
