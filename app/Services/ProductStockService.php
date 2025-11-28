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

            $item->stocks = $productStocks;
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
}
