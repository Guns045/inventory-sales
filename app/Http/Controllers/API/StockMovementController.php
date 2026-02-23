<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ProductStockService;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    protected $productStockService;

    public function __construct(ProductStockService $productStockService)
    {
        $this->productStockService = $productStockService;
    }

    /**
     * Get list of stock movements with filters
     */
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'warehouse_id', 'start_date', 'end_date', 'type']);
        $perPage = $request->input('per_page', 20);

        $movements = $this->productStockService->getAllMovements($filters, $perPage);

        // Append related_party accessor to result
        $movements->getCollection()->transform(function ($movement) {
            $movement->setAttribute('related_party', $movement->related_party);
            return $movement;
        });

        return response()->json($movements);
    }
}
