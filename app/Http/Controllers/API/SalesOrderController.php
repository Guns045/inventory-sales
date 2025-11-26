<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSalesOrderRequest;
use App\Http\Requests\UpdateSalesOrderRequest;
use App\Http\Requests\UpdateSalesOrderStatusRequest;
use App\Http\Resources\SalesOrderResource;
use App\Models\SalesOrder;
use App\Services\SalesOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SalesOrderController extends Controller
{
    protected $salesOrderService;

    public function __construct(SalesOrderService $salesOrderService)
    {
        $this->salesOrderService = $salesOrderService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SalesOrder::with(['customer', 'user', 'items.product', 'quotation', 'warehouse']);

        // Filter by status if provided
        if ($request->has('status')) {
            $requestedStatus = $request->status;
            Log::info('SalesOrder index: Filtering by status: ' . $requestedStatus);
            $query->where('status', $requestedStatus);
        }

        // Filter by user warehouse access
        $user = $request->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('warehouse_id', $user->warehouse_id);
            });
            Log::info('SalesOrder index: Filtering by warehouse: ' . $user->warehouse_id);
        }

        $salesOrders = $query->paginate(10);

        return SalesOrderResource::collection($salesOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSalesOrderRequest $request)
    {
        try {
            $salesOrder = $this->salesOrderService->createSalesOrder($request->validated());
            return new SalesOrderResource($salesOrder);
        } catch (\Exception $e) {
            Log::error('SalesOrder Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create sales order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $salesOrder = SalesOrder::with(['customer', 'user', 'salesOrderItems.product', 'warehouse'])->findOrFail($id);
        return new SalesOrderResource($salesOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSalesOrderRequest $request, $id)
    {
        $salesOrder = SalesOrder::findOrFail($id);

        try {
            $salesOrder = $this->salesOrderService->updateSalesOrder($salesOrder, $request->validated());
            return new SalesOrderResource($salesOrder);
        } catch (\Exception $e) {
            Log::error('SalesOrder Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update sales order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $salesOrder = SalesOrder::findOrFail($id);
        $salesOrder->delete();

        return response()->json(['message' => 'Sales Order deleted successfully']);
    }

    public function getSalesOrderItems($id)
    {
        try {
            $salesOrder = SalesOrder::with('items.product')->findOrFail($id);
            return response()->json($salesOrder->items);
        } catch (\Exception $e) {
            Log::error('getSalesOrderItems: Error - ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching sales order items: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateStatus(UpdateSalesOrderStatusRequest $request, $id)
    {
        $salesOrder = SalesOrder::findOrFail($id);

        try {
            $salesOrder = $this->salesOrderService->updateStatus($salesOrder, $request->status);
            return new SalesOrderResource($salesOrder);
        } catch (\Exception $e) {
            Log::error('SalesOrder Update Status Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update sales order status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createPickingList(Request $request, $id)
    {
        try {
            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($id);

            $pickingList = $this->salesOrderService->createPickingList($salesOrder, $request->notes);

            return response()->json([
                'message' => 'Picking List created successfully!',
                'data' => $pickingList
            ], 201);

        } catch (\Exception $e) {
            Log::error('createPickingList: Error - ' . $e->getMessage());
            return response()->json([
                'message' => 'Error creating Picking List: ' . $e->getMessage(),
            ], 500);
        }
    }
}
