<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePickingListRequest;
use App\Http\Requests\UpdatePickingListRequest;
use App\Http\Resources\PickingListResource;
use App\Models\PickingList;
use App\Services\PickingListService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PickingListController extends Controller
{
    protected $pickingListService;

    public function __construct(PickingListService $pickingListService)
    {
        $this->pickingListService = $pickingListService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = PickingList::with(['salesOrder.customer', 'user', 'items.product'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('picking_list_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('salesOrder', function ($subQ) use ($search) {
                        $subQ->where('sales_order_number', 'like', "%{$search}%");
                    });
            });
        }

        $pickingLists = $query->paginate(10);
        return PickingListResource::collection($pickingLists);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePickingListRequest $request)
    {
        try {
            if ($request->has('delivery_order_id')) {
                $pickingList = $this->pickingListService->createFromDeliveryOrder(
                    $request->delivery_order_id,
                    auth()->user(),
                    $request->notes
                );
            } else {
                $pickingList = $this->pickingListService->createFromOrder(
                    $request->sales_order_id,
                    auth()->user(),
                    $request->notes
                );
            }


            // Generate PDF immediately
            $pdf = $this->pickingListService->generatePDF($pickingList);
            $output = $pdf->output();
            $pdfContent = base64_encode($output);

            Log::info('PDF Generated size: ' . strlen($output));
            Log::info('Base64 Content length: ' . strlen($pdfContent));

            return (new PickingListResource($pickingList))->additional([
                'pdf_content' => $pdfContent,
                'filename' => 'PickingList-' . $pickingList->picking_list_number . '.pdf'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error creating Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $pickingList = PickingList::with([
            'salesOrder.customer',
            'salesOrder.items.product',
            'items.product',
            'items.warehouse',
            'user'
        ])->findOrFail($id);

        return new PickingListResource($pickingList);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePickingListRequest $request, $id)
    {
        try {
            $pickingList = PickingList::findOrFail($id);
            $pickingList = $this->pickingListService->updatePickingList($pickingList, $request->validated());
            return new PickingListResource($pickingList);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error updating Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $pickingList = PickingList::findOrFail($id);
            $this->pickingListService->deletePickingList($pickingList);
            return response()->json(['message' => 'Picking List deleted successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error deleting Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get items for a specific picking list
     */
    public function getItems($id)
    {
        $pickingList = PickingList::with(['items.product', 'items.warehouse'])->findOrFail($id);
        return response()->json($pickingList->items);
    }

    /**
     * Print picking list
     */
    public function print($id)
    {
        try {
            $pickingList = PickingList::findOrFail($id);
            $pdf = $this->pickingListService->generatePDF($pickingList);

            $filename = "PickingList-" . str_replace(['/', '\\'], '_', $pickingList->picking_list_number) . ".pdf";
            return $pdf->stream($filename);
        } catch (\Exception $e) {
            Log::error('Error generating Picking List PDF: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Error generating PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete picking list
     */
    public function complete($id)
    {
        try {
            $pickingList = PickingList::findOrFail($id);
            $pickingList = $this->pickingListService->completePickingList($pickingList);
            return new PickingListResource($pickingList);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error completing Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get picking lists that are ready for delivery order creation
     */
    public function getAvailableForDelivery()
    {
        $availablePickingLists = PickingList::with(['salesOrder.customer', 'items.product'])
            ->where('status', 'COMPLETED')
            ->whereDoesntHave('deliveryOrders')
            ->orderBy('completed_at', 'desc')
            ->get();

        return PickingListResource::collection($availablePickingLists);
    }

    /**
     * Generate picking list PDF from sales order
     */
    public function createFromSalesOrder(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id'
        ]);

        try {
            $user = auth()->user();
            $pickingList = $this->pickingListService->createFromOrder(
                $request->sales_order_id,
                $user,
                $request->notes
            );

            // Generate PDF
            $pdf = $this->pickingListService->generatePDF($pickingList);
            $pdfContent = base64_encode($pdf->output());

            return (new PickingListResource($pickingList))->additional([
                'pdf_content' => $pdfContent,
                'filename' => 'PickingList-' . $pickingList->picking_list_number . '.pdf'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create picking list: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate picking list PDF from warehouse transfer
     */
    public function createFromTransfer(Request $request)
    {
        $request->validate([
            'warehouse_transfer_id' => 'required|exists:warehouse_transfers,id'
        ]);

        try {
            $transfer = \App\Models\WarehouseTransfer::with(['product', 'warehouseFrom', 'warehouseTo', 'requestedBy'])
                ->findOrFail($request->warehouse_transfer_id);

            $result = $this->pickingListService->generatePDFFromTransfer($transfer);

            return response()->json($result, 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate picking list: ' . $e->getMessage()
            ], 500);
        }
    }
}