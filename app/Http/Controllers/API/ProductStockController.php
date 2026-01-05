<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductStockRequest;
use App\Http\Requests\UpdateProductStockRequest;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Resources\ProductStockResource;
use App\Models\ProductStock;
use App\Services\ProductStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Imports\ProductStockImport;
use Maatwebsite\Excel\Facades\Excel;

class ProductStockController extends Controller
{
    protected $productStockService;

    public function __construct(ProductStockService $productStockService)
    {
        $this->productStockService = $productStockService;
    }

    /**
     * Display a listing of the resource with role-based filtering.
     */
    public function index(Request $request)
    {
        try {
            $filters = [
                'view_mode' => $request->get('view_mode', 'per-warehouse'),
                'search' => $request->get('search', ''),
                'warehouse_id' => $request->get('warehouse_id', ''),
                'per_page' => $request->get('per_page', 10),
            ];

            $stocks = $this->productStockService->getStockLevels($filters, $request->user());
            return ProductStockResource::collection($stocks);

        } catch (\Exception $e) {
            Log::error('ProductStock Index Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching stock levels',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProductStockRequest $request)
    {
        try {
            $productStock = $this->productStockService->createStock($request->validated());
            return new ProductStockResource($productStock);

        } catch (\Exception $e) {
            Log::error('ProductStock Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create product stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $productStock = ProductStock::with(['product', 'warehouse'])->findOrFail($id);
            return new ProductStockResource($productStock);

        } catch (\Exception $e) {
            Log::error('ProductStock Show Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Product stock not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProductStockRequest $request, $id)
    {
        try {
            $productStock = ProductStock::findOrFail($id);
            $productStock = $this->productStockService->updateStock($productStock, $request->validated());
            return new ProductStockResource($productStock);

        } catch (\Exception $e) {
            Log::error('ProductStock Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update product stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $productStock = ProductStock::findOrFail($id);
            $this->productStockService->deleteStock($productStock);

            return response()->json(['message' => 'Product stock deleted successfully']);

        } catch (\Exception $e) {
            Log::error('ProductStock Delete Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete product stock',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove multiple resources from storage.
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:product_stock,id'
        ]);

        try {
            $result = $this->productStockService->bulkDeleteStock($request->ids);

            if ($result['fail_count'] > 0) {
                return response()->json([
                    'message' => 'Bulk delete completed with some errors',
                    'details' => $result
                ], 207); // Multi-Status
            }

            return response()->json([
                'message' => 'Selected stocks deleted successfully',
                'details' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('ProductStock Bulk Delete Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete selected stocks',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Adjust stock quantity manually.
     */
    public function adjustStock(AdjustStockRequest $request)
    {
        try {
            $result = $this->productStockService->adjustStock($request->validated());
            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Stock Adjustment Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to adjust stock',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get stock movement history for a product stock.
     */
    public function getMovementHistory($productStockId)
    {
        try {
            $movements = $this->productStockService->getMovementHistory($productStockId);
            return response()->json($movements);

        } catch (\Exception $e) {
            Log::error('Movement History Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch movement history',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Toggle stock visibility (Hide/Unhide).
     */
    public function toggleVisibility($id)
    {
        try {
            $productStock = ProductStock::findOrFail($id);

            // Only Super Admin can toggle visibility
            $user = request()->user();
            if (!($user->role === 'Super Admin' || ($user->role && $user->role->name === 'Super Admin'))) {
                return response()->json([
                    'message' => 'Unauthorized. Only Super Admin can hide/unhide stock.'
                ], 403);
            }

            $productStock->is_hidden = !$productStock->is_hidden;
            $productStock->save();

            $status = $productStock->is_hidden ? 'hidden' : 'visible';

            return response()->json([
                'message' => "Stock is now {$status}",
                'data' => new ProductStockResource($productStock)
            ]);

        } catch (\Exception $e) {
            Log::error('Toggle Visibility Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to toggle visibility',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls',
            'warehouse_id' => 'required|exists:warehouses,id'
        ]);

        try {
            Excel::import(new ProductStockImport($request->warehouse_id, $request->user()->id), $request->file('file'));
            return response()->json(['message' => 'Stock imported successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $filters = [
                'view_mode' => $request->get('view_mode', 'per-warehouse'),
                'search' => $request->get('search', ''),
                'warehouse_id' => $request->get('warehouse_id', ''),
                // No per_page for export, we want all
            ];

            // Re-implementing query logic here to avoid pagination and get all results
            // Or we could modify service to accept 'all' as per_page, but let's keep it simple here for now
            // Actually, let's reuse the service logic but without pagination if possible.
            // But the service methods return paginators.
            // Let's just build the query here similar to service.

            $query = ProductStock::with(['product.category', 'warehouse']);

            if ($filters['search']) {
                $search = $filters['search'];
                $query->whereHas('product', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            }

            if ($filters['warehouse_id'] && $filters['warehouse_id'] !== 'all') {
                $query->where('warehouse_id', $filters['warehouse_id']);
            }

            // Role-based filtering
            $user = $request->user();
            if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
                $query->where('warehouse_id', $user->warehouse_id);
            }

            $stocks = $query->get();

            return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ProductStockExport($stocks), 'product_stock.xlsx');

        } catch (\Exception $e) {
            Log::error('ProductStock Export Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to export product stock',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function downloadTemplate()
    {
        $data = [
            ['part_number', 'description', 'quantity', 'bin_location', 'weight'],
            ['PART-001', 'Sample Product', '100', 'A-01-01', '1.5'],
        ];

        return response()->streamDownload(function () use ($data) {
            $file = fopen('php://output', 'w');
            foreach ($data as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        }, 'stock_import_template.csv');
    }
}
