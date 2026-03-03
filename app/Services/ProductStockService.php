<?php

namespace App\Services;

use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\DeliveryOrder;
use App\Models\GoodsReceipt;
use App\Models\SalesOrder;
use App\Models\Quotation;
use App\Models\SalesReturn;
use App\Models\WarehouseTransfer;
use App\Models\PurchaseOrder;
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
        if ($user) {
            $roleName = $user->role ? $user->role->name : null;

            if ($roleName !== 'Super Admin') {
                // Sales Team can view all warehouse stock data
                if ($roleName === 'Sales Team') {
                    // Sales Team can see all warehouses - no warehouse filtering
                } else {
                    // Filter other roles by assigned warehouse
                    if ($user->warehouse_id) {
                        $query->where('warehouse_id', $user->warehouse_id);
                    }
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
            $item->available_quantity = $item->quantity - $item->reserved_quantity - ($item->damaged_quantity ?? 0);
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
            $item->damaged_quantity = $productStocks->sum('damaged_quantity');
            $item->available_quantity = $item->quantity - $item->reserved_quantity - $item->damaged_quantity;
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
        return DB::transaction(function () use ($data) {
            // Check if combination already exists
            $existing = ProductStock::where('product_id', $data['product_id'])
                ->where('warehouse_id', $data['warehouse_id'])
                ->first();

            if ($existing) {
                throw new \Exception('Product stock record already exists for this product and warehouse');
            }

            // Update product weight if provided
            if (isset($data['weight'])) {
                $product = \App\Models\Product::find($data['product_id']);
                if ($product) {
                    $product->weight = $data['weight'];
                    $product->save();
                }
                unset($data['weight']);
            }

            $productStock = ProductStock::create($data);

            // Log movement if initial quantity is set
            if (isset($data['quantity']) && $data['quantity'] > 0) {
                StockMovement::create([
                    'product_id' => $productStock->product_id,
                    'warehouse_id' => $productStock->warehouse_id,
                    'type' => 'IN',
                    'quantity_change' => $data['quantity'],
                    'reference_type' => ProductStock::class,
                    'reference_id' => $productStock->id,
                    'notes' => 'Initial stock creation',
                    'user_id' => Auth::id(),
                    'previous_quantity' => 0,
                    'new_quantity' => $data['quantity']
                ]);
            }

            return $productStock;
        });
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
        return DB::transaction(function () use ($productStock, $data) {
            // Ensure the combination doesn't already exist for a different record
            $existing = ProductStock::where('product_id', $data['product_id'] ?? $productStock->product_id)
                ->where('warehouse_id', $data['warehouse_id'] ?? $productStock->warehouse_id)
                ->where('id', '!=', $productStock->id)
                ->first();

            if ($existing) {
                throw new \Exception('Product stock record already exists for this product and warehouse');
            }

            // Detect quantity change before update
            $previousQuantity = $productStock->quantity;
            $newQuantity = isset($data['quantity']) ? (int) $data['quantity'] : $previousQuantity;
            $quantityChange = $newQuantity - $previousQuantity;

            // Update product weight if provided
            if (isset($data['weight'])) {
                $product = $productStock->product;
                if ($product) {
                    $product->weight = $data['weight'];
                    $product->save();
                }
                unset($data['weight']);
            }

            $productStock->update($data);

            // Log movement if quantity changed
            if ($quantityChange !== 0) {
                StockMovement::create([
                    'product_id' => $productStock->product_id,
                    'warehouse_id' => $productStock->warehouse_id,
                    'type' => $quantityChange > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                    'quantity_change' => $quantityChange,
                    'reference_type' => ProductStock::class,
                    'reference_id' => $productStock->id,
                    'notes' => 'Manual update via stock edit',
                    'user_id' => Auth::id(),
                    'previous_quantity' => $previousQuantity,
                    'new_quantity' => $newQuantity
                ]);
            }

            return $productStock;
        });
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
                'reference_type' => ProductStock::class,
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
            ->whereNotIn('type', ['RESERVATION', 'RELEASE_RESERVATION'])
            ->with(['user', 'reference'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get all stock movements with filters
     * 
     * @param array $filters
     * @param int $perPage
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getAllMovements(array $filters, int $perPage = 50)
    {
        $query = StockMovement::with([
            'product',
            'warehouse',
            'user',
            'reference' => function ($morphTo) {
                $morphTo->morphWith([
                    'DeliveryOrder' => ['customer', 'salesOrder.customer', 'warehouseTransfer'],
                    'GoodsReceipt' => ['purchaseOrder.supplier'],
                    'PurchaseOrder' => ['supplier'],
                    'SalesOrder' => ['customer'],
                    'Quotation' => ['customer'],
                    'SalesReturn' => ['salesOrder.customer'],
                    'WarehouseTransfer' => [],
                    'ProductStock' => [],
                ]);
            }
        ]);

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            });
        }

        if (isset($filters['warehouse_id']) && $filters['warehouse_id'] !== 'all') {
            $query->where('warehouse_id', $filters['warehouse_id']);
        }

        if (isset($filters['start_date'])) {
            $query->whereDate('created_at', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('created_at', '<=', $filters['end_date']);
        }

        if (isset($filters['type']) && $filters['type'] !== 'all') {
            $query->where('type', strtoupper($filters['type']));
        } else {
            // By default, exclude reservation-only logical movements for a cleaner trail
            // UNLESS specifically requested via filters
            $query->whereNotIn('type', ['RESERVATION', 'RELEASE_RESERVATION']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }
    /**
     * Reserve stock for a product
     *
     * @param int $productId
     * @param int $warehouseId
     * @param int $quantity
     * @param string $referenceType
     * @param int $referenceId
     * @param string|null $referenceNumber
     * @return ProductStock
     * @throws \Exception
     */
    public function reserveStock(int $productId, int $warehouseId, int $quantity, string $referenceType, int $referenceId, ?string $referenceNumber = null): ProductStock
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $referenceType, $referenceId, $referenceNumber) {
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                $productStock = ProductStock::create([
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                    'quantity' => 0,
                    'reserved_quantity' => 0
                ]);
            }

            // Check available stock (quantity - reserved_quantity)
            $availableQuantity = $productStock->quantity - $productStock->reserved_quantity;
            if ($availableQuantity < $quantity) {
                $product = $productStock->product;
                $details = $product ? "{$product->sku} - {$product->name}" : "ID {$productId}";
                throw new \Exception("Insufficient available stock for {$details}. Available: {$availableQuantity}, Requested: {$quantity}");
            }

            $productStock->reserved_quantity += $quantity;
            $productStock->save();

            // Create Stock Movement for trackable trail
            StockMovement::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'RESERVATION',
                'quantity_change' => -$quantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'created_by' => Auth::id(),
                'notes' => 'Stock reserved for transaction',
            ]);

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
     * @param string|null $referenceNumber
     * @return ProductStock
     * @throws \Exception
     */
    public function deductStock(int $productId, int $warehouseId, int $quantity, string $referenceType, int $referenceId, string $notes = '', ?string $referenceNumber = null): ProductStock
    {
        return DB::transaction(function () use ($productId, $warehouseId, $quantity, $referenceType, $referenceId, $notes, $referenceNumber) {
            $productStock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                $product = \App\Models\Product::find($productId);
                $productName = $product ? $product->name : "Product ID $productId";
                throw new \Exception("Insufficient physical stock for '{$productName}' (Record not found). Quantity: 0, Requested: {$quantity}");
            }

            if ($productStock->quantity < $quantity) {
                $product = $productStock->product;
                $details = $product ? "{$product->sku} - {$product->name}" : "ID {$productId}";
                throw new \Exception("Insufficient physical stock for {$details}. Physical Quantity: {$productStock->quantity}, Requested: {$quantity}");
            }

            $previousQuantity = $productStock->quantity;
            $quantityFromReserved = min($productStock->reserved_quantity, $quantity);

            // Update quantities
            $productStock->quantity -= $quantity;
            $productStock->reserved_quantity -= $quantityFromReserved;
            $productStock->save();

            // 1. Log "Balanced Release" if we are shipping items that were reserved
            // This prevents "double counting" confusion in the audit trail sum.
            if ($quantityFromReserved > 0) {
                StockMovement::create([
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                    'type' => 'RELEASE_RESERVATION',
                    'quantity_change' => $quantityFromReserved,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'reference_number' => $referenceNumber,
                    'created_by' => Auth::id(),
                    'notes' => 'Automatically releasing reserved stock for shipment',
                ]);
            }

            // 2. Log Actual Physical Deduction
            StockMovement::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'OUT',
                'quantity_change' => -$quantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'notes' => $notes,
                'created_by' => Auth::id(),
                'previous_quantity' => $previousQuantity,
                'new_quantity' => $productStock->quantity
            ]);

            return $productStock;
        });
    }
}
