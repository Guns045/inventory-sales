<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSalesOrderRequest;
use App\Http\Requests\UpdateSalesOrderRequest;
use App\Http\Requests\UpdateSalesOrderStatusRequest;
use App\Http\Resources\SalesOrderResource;
use App\Http\Resources\PickingListResource;
use App\Models\SalesOrder;
use App\Services\SalesOrderService;
use App\Services\PickingListService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SalesOrderController extends Controller
{
    protected $salesOrderService;
    protected $pickingListService;

    public function __construct(SalesOrderService $salesOrderService, PickingListService $pickingListService)
    {
        $this->salesOrderService = $salesOrderService;
        $this->pickingListService = $pickingListService;
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

            if (str_contains($requestedStatus, ',')) {
                $statuses = explode(',', $requestedStatus);
                $query->whereIn('status', $statuses);
            } else {
                $query->where('status', $requestedStatus);
            }
        }

        // Search functionality
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('sales_order_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('company_name', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by user warehouse access
        $user = $request->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('warehouse_id', $user->warehouse_id);
            });
            Log::info('SalesOrder index: Filtering by warehouse: ' . $user->warehouse_id);
        }

        $salesOrders = $query->orderBy('created_at', 'desc')->paginate(2000);

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

    public function cancel($id)
    {
        $salesOrder = SalesOrder::findOrFail($id);

        if (!in_array($salesOrder->status, ['PENDING', 'PROCESSING', 'READY_TO_SHIP'])) {
            return response()->json([
                'message' => 'Cannot cancel order with status: ' . $salesOrder->status
            ], 400);
        }

        try {
            $salesOrder = $this->salesOrderService->updateStatus($salesOrder, 'CANCELLED');
            return new SalesOrderResource($salesOrder);
        } catch (\Exception $e) {
            Log::error('SalesOrder Cancel Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to cancel sales order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createPickingList(Request $request, $id)
    {
        try {
            // Use PickingListService to create the picking list
            // Note: The service expects (int $salesOrderId, User $user, ?string $notes)
            $pickingList = $this->pickingListService->createFromOrder(
                $id,
                auth()->user(),
                $request->notes
            );

            return response()->json([
                'message' => 'Picking List created successfully!',
                'data' => new PickingListResource($pickingList)
            ], 201);

        } catch (\Exception $e) {
            Log::error('createPickingList: Error - ' . $e->getMessage());
            return response()->json([
                'message' => 'Error creating Picking List: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $query = SalesOrder::with(['customer', 'user', 'items.product', 'quotation', 'warehouse']);

            // Filter by status if provided
            if ($request->has('status')) {
                $requestedStatus = $request->status;
                if (str_contains($requestedStatus, ',')) {
                    $statuses = explode(',', $requestedStatus);
                    $query->whereIn('status', $statuses);
                } else {
                    $query->where('status', $requestedStatus);
                }
            }

            // Search functionality
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('sales_order_number', 'like', "%{$search}%")
                        ->orWhereHas('customer', function ($customerQuery) use ($search) {
                            $customerQuery->where('company_name', 'like', "%{$search}%");
                        });
                });
            }

            // Filter by user warehouse access
            $user = $request->user();
            if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
                $query->whereHas('user', function ($q) use ($user) {
                    $q->where('warehouse_id', $user->warehouse_id);
                });
            }

            $salesOrders = $query->orderBy('created_at', 'desc')->get();

            return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\SalesOrderExport($salesOrders), 'sales_orders.xlsx');

        } catch (\Exception $e) {
            Log::error('SalesOrder Export Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to export sales orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
