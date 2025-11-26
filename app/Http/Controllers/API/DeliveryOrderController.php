<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeliveryOrderRequest;
use App\Http\Requests\UpdateDeliveryOrderRequest;
use App\Http\Requests\UpdateDeliveryOrderStatusRequest;
use App\Http\Requests\MarkAsDeliveredRequest;
use App\Http\Resources\DeliveryOrderResource;
use App\Models\DeliveryOrder;
use App\Models\SalesOrder;
use App\Models\PickingList;
use App\Services\DeliveryOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DeliveryOrderController extends Controller
{
    protected $deliveryOrderService;

    public function __construct(DeliveryOrderService $deliveryOrderService)
    {
        $this->deliveryOrderService = $deliveryOrderService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = DeliveryOrder::with(['customer', 'salesOrder', 'deliveryOrderItems.product'])
            ->orderBy('created_at', 'desc');

        // Filter by source_type if provided
        if ($request->has('source_type')) {
            $query->where('source_type', $request->source_type);
        }

        $deliveryOrders = $query->paginate(10);
        return DeliveryOrderResource::collection($deliveryOrders);
    }

    /**
     * Get ready to create delivery orders (SO yang sudah SHIPPED tapi belum ada DO)
     */
    public function readyToCreate()
    {
        $shippedSalesOrders = SalesOrder::with(['customer', 'salesOrderItems.product', 'user'])
            ->where('status', 'SHIPPED')
            ->whereDoesntHave('deliveryOrder')
            ->orderBy('updated_at', 'desc')
            ->paginate(10);

        return response()->json($shippedSalesOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreDeliveryOrderRequest $request)
    {
        try {
            $deliveryOrder = $this->deliveryOrderService->createFromSalesOrder(
                $request->sales_order_id,
                $request->validated()
            );
            return new DeliveryOrderResource($deliveryOrder);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create delivery order',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $deliveryOrder = DeliveryOrder::with(['customer', 'salesOrder', 'deliveryOrderItems.product'])->findOrFail($id);
        return new DeliveryOrderResource($deliveryOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateDeliveryOrderRequest $request, $id)
    {
        try {
            $deliveryOrder = DeliveryOrder::findOrFail($id);
            $deliveryOrder = $this->deliveryOrderService->updateDeliveryOrder($deliveryOrder, $request->validated());
            return new DeliveryOrderResource($deliveryOrder);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update delivery order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update delivery order status
     */
    public function updateStatus(UpdateDeliveryOrderStatusRequest $request, $id)
    {
        try {
            $deliveryOrder = DeliveryOrder::findOrFail($id);
            $deliveryOrder = $this->deliveryOrderService->updateStatus($deliveryOrder, $request->status);
            return new DeliveryOrderResource($deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']));
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update delivery order status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $deliveryOrder = DeliveryOrder::findOrFail($id);
        $deliveryOrder->delete();

        return response()->json(['message' => 'Delivery Order deleted successfully']);
    }

    public function getDeliveryOrderItems($id)
    {
        $deliveryOrder = DeliveryOrder::with('deliveryOrderItems.product')->findOrFail($id);
        return response()->json($deliveryOrder->deliveryOrderItems);
    }

    /**
     * Create delivery order from picking list
     */
    public function createFromPickingList(Request $request)
    {
        $request->validate([
            'picking_list_id' => 'required|exists:picking_lists,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
        ]);

        try {
            $deliveryOrder = $this->deliveryOrderService->createFromPickingList(
                $request->picking_list_id,
                $request->all()
            );
            return new DeliveryOrderResource($deliveryOrder);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Mark delivery order as shipped
     */
    public function markAsShipped($id)
    {
        try {
            $deliveryOrder = DeliveryOrder::findOrFail($id);
            $deliveryOrder = $this->deliveryOrderService->markAsShipped($deliveryOrder);
            return new DeliveryOrderResource($deliveryOrder->load(['customer', 'salesOrder', 'pickingList', 'deliveryOrderItems.product']));
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Mark delivery order as delivered
     */
    public function markAsDelivered(MarkAsDeliveredRequest $request, $id)
    {
        try {
            $deliveryOrder = DeliveryOrder::findOrFail($id);
            $deliveryOrder = $this->deliveryOrderService->markAsDelivered($deliveryOrder, $request->validated());
            return new DeliveryOrderResource($deliveryOrder->load(['customer', 'salesOrder', 'pickingList', 'deliveryOrderItems.product']));
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Print delivery order
     */
    public function print($id)
    {
        try {
            $deliveryOrder = DeliveryOrder::findOrFail($id);
            $pdf = $this->deliveryOrderService->generatePDF($deliveryOrder);

            $safeNumber = str_replace(['/', '\\'], '_', $deliveryOrder->delivery_order_number);
            return $pdf->stream("delivery-order-{$safeNumber}.pdf");
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create delivery order from sales order (for warehouse workflow)
     */
    public function createFromSalesOrder(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'kurir' => 'nullable|string|max:255',
        ]);

        try {
            $deliveryOrder = $this->deliveryOrderService->createFromSalesOrder(
                $request->sales_order_id,
                $request->all()
            );
            return new DeliveryOrderResource($deliveryOrder);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get delivery orders that can be generated from picking lists
     */
    public function getAvailablePickingLists()
    {
        $availablePickingLists = PickingList::with(['salesOrder.customer', 'items.product'])
            ->where('status', 'COMPLETED')
            ->whereDoesntHave('deliveryOrders')
            ->orderBy('completed_at', 'desc')
            ->get();

        return response()->json($availablePickingLists);
    }

    /**
     * Create delivery order from warehouse transfer
     */
    public function createFromTransfer(Request $request)
    {
        $request->validate([
            'warehouse_transfer_id' => 'required|exists:warehouse_transfers,id'
        ]);

        try {
            $transfer = \App\Models\WarehouseTransfer::with(['product', 'warehouseFrom', 'warehouseTo'])
                ->findOrFail($request->warehouse_transfer_id);

            if ($transfer->status !== 'IN_TRANSIT') {
                return response()->json([
                    'message' => 'Only transfers in IN_TRANSIT status can generate delivery orders'
                ], 400);
            }

            // Check if delivery order already exists
            $existingDO = DeliveryOrder::where('source_type', 'IT')
                ->where('source_id', $transfer->id)
                ->first();

            if ($existingDO) {
                return response()->json([
                    'message' => 'Delivery order already exists for this transfer',
                    'delivery_order' => $existingDO
                ], 200);
            }

            // Generate PDF using service (we can extend service to handle this)
            $deliveryData = \App\Transformers\DeliveryOrderTransformer::transformFromWarehouseTransfer($transfer);
            $companyData = \App\Transformers\DeliveryOrderTransformer::getCompanyData();

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.delivery-order-universal', [
                'delivery' => $deliveryData,
                'company' => $companyData,
                'source_type' => 'IT'
            ]);
            $pdfContent = $pdf->output();

            $filename = "DeliveryOrder_Transfer_" . str_replace(['/', '\\'], '_', $deliveryData['delivery_no']) . ".pdf";

            return response()->json([
                'message' => 'Delivery order generated successfully',
                'delivery_order_number' => $deliveryData['delivery_no'],
                'pdf_content' => base64_encode($pdfContent),
                'filename' => $filename
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate delivery order: ' . $e->getMessage()
            ], 500);
        }
    }
}
