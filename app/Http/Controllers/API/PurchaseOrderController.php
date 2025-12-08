<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseOrderRequest;
use App\Http\Requests\UpdatePurchaseOrderRequest;
use App\Http\Requests\UpdatePurchaseOrderStatusRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderService;
use App\Transformers\PurchaseOrderTransformer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PurchaseOrderController extends Controller
{
    protected $purchaseOrderService;

    public function __construct(PurchaseOrderService $purchaseOrderService)
    {
        $this->purchaseOrderService = $purchaseOrderService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'warehouse', 'user', 'items.product']);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by supplier if provided
        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by user warehouse access
        $user = $request->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->where('warehouse_id', $user->warehouse_id);
        }

        // Date range filtering
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $purchaseOrders = $query->orderBy('created_at', 'desc')->paginate(2000);
        return PurchaseOrderResource::collection($purchaseOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePurchaseOrderRequest $request)
    {
        try {
            $purchaseOrder = $this->purchaseOrderService->createPurchaseOrder($request->validated());
            return new PurchaseOrderResource($purchaseOrder);
        } catch (\Exception $e) {
            Log::error('PurchaseOrder Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create purchase order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $purchaseOrder = PurchaseOrder::with([
            'supplier',
            'warehouse',
            'user',
            'items.product',
            'goodsReceipts.receivedBy'
        ])->findOrFail($id);

        // Check warehouse access for non-super admins
        $user = request()->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id != $purchaseOrder->warehouse_id) {
            return response()->json(['message' => 'Unauthorized access to this purchase order'], 403);
        }

        return new PurchaseOrderResource($purchaseOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePurchaseOrderRequest $request, $id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        // Check if PO can be edited (only DRAFT status)
        if ($purchaseOrder->status !== 'DRAFT') {
            return response()->json(['message' => 'Only draft purchase orders can be edited'], 422);
        }

        try {
            $purchaseOrder = $this->purchaseOrderService->updatePurchaseOrder($purchaseOrder, $request->validated());
            return new PurchaseOrderResource($purchaseOrder);
        } catch (\Exception $e) {
            Log::error('PurchaseOrder Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update purchase order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        // Check if PO can be deleted (only DRAFT status)
        if ($purchaseOrder->status !== 'DRAFT') {
            return response()->json(['message' => 'Only draft purchase orders can be deleted'], 422);
        }

        try {
            // We can add a delete method in service if needed, but simple delete is fine here
            // However, to keep consistency with logging, we might want to move it to service later
            // For now, I'll keep the logic here but simplified

            // Delete related items first
            $purchaseOrder->items()->delete();

            // Log activity before deletion
            \App\Models\ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Deleted Purchase Order',
                'description' => "Deleted PO {$purchaseOrder->po_number}",
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            $purchaseOrder->delete();

            return response()->json(['message' => 'Purchase Order deleted successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete purchase order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update purchase order status
     */
    public function updateStatus(UpdatePurchaseOrderStatusRequest $request, $id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        try {
            $purchaseOrder = $this->purchaseOrderService->updateStatus($purchaseOrder, $request->status, $request->notes);
            return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'warehouse', 'user']));
        } catch (\Exception $e) {
            Log::error('PurchaseOrder Update Status Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update purchase order status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get purchase orders ready for goods receipt
     */
    public function getPurchaseOrderItems($id)
    {
        $purchaseOrder = PurchaseOrder::with(['items.product', 'warehouse'])->findOrFail($id);
        return response()->json($purchaseOrder->items);
    }

    /**
     * Get purchase orders ready for goods receipt
     */
    public function readyForGoodsReceipt()
    {
        $query = PurchaseOrder::with(['supplier', 'warehouse', 'items.product'])
            ->where(function ($q) {
                $q->where('status', 'SENT')
                    ->orWhere('status', 'CONFIRMED')
                    ->orWhere('status', 'PARTIAL_RECEIVED');
            });

        // Filter by user warehouse access
        $user = request()->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->where('warehouse_id', $user->warehouse_id);
        }

        $purchaseOrders = $query->orderBy('created_at', 'desc')->get();
        return PurchaseOrderResource::collection($purchaseOrders);
    }

    /**
     * Print Purchase Order PDF
     */
    public function printPDF($id)
    {
        // Load purchase order dengan relationships
        $purchaseOrder = PurchaseOrder::with([
            'supplier',
            'warehouse',
            'user',
            'items.product'
        ])->findOrFail($id);

        // Check warehouse access for non-super admins
        $user = request()->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id != $purchaseOrder->warehouse_id) {
            return response()->json(['message' => 'Unauthorized access to this purchase order'], 403);
        }

        // Log activity
        \App\Models\ActivityLog::log(
            'Printed Purchase Order',
            "Printed PO {$purchaseOrder->po_number}",
            $purchaseOrder
        );

        // Transform data untuk template
        $purchaseOrderData = PurchaseOrderTransformer::transform($purchaseOrder);
        $companyData = PurchaseOrderTransformer::getCompanyData();

        // Generate PDF dengan DOMPDF
        $options = new \Dompdf\Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new \Dompdf\Dompdf($options);

        $html = view('pdf.purchase-order', [
            'purchaseOrder' => $purchaseOrderData,
            'company' => $companyData
        ])->render();

        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        // Safe filename
        $safeNumber = str_replace(['/', '\\'], '_', $purchaseOrder->po_number);

        // Generate PDF output
        $pdfOutput = $dompdf->output();

        // Create response with proper CORS headers
        $response = response($pdfOutput, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"Purchase-Order-{$safeNumber}.pdf\"",
            'Access-Control-Allow-Origin' => request()->header('Origin', '*'),
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, X-Auth-Token, Origin, Authorization',
            'Access-Control-Allow-Credentials' => 'true'
        ]);

        return $response;
    }

    /**
     * Send Purchase Order via email
     */
    public function sendPO(Request $request, $id)
    {
        $request->validate([
            'recipient_email' => 'required|email',
            'custom_message' => 'nullable|string'
        ]);

        $purchaseOrder = PurchaseOrder::with(['supplier', 'user'])->findOrFail($id);

        // Check if PO can be sent (only DRAFT status can be sent)
        if ($purchaseOrder->status !== 'DRAFT') {
            return response()->json([
                'message' => 'Only draft purchase orders can be sent',
                'status' => $purchaseOrder->status
            ], 422);
        }

        try {
            $result = $this->purchaseOrderService->sendPurchaseOrder(
                $purchaseOrder,
                $request->recipient_email,
                $request->custom_message
            );

            return response()->json([
                'message' => 'Purchase Order sent successfully',
                'po_number' => $purchaseOrder->po_number,
                'status' => $purchaseOrder->status,
                'email_log_id' => $result['email_log_id']
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send Purchase Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel purchase order
     */
    public function cancel(Request $request, $id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        // Check if PO can be cancelled
        if (in_array($purchaseOrder->status, ['COMPLETED', 'CANCELLED'])) {
            return response()->json(['message' => 'Purchase Order cannot be cancelled in current status'], 422);
        }

        $request->validate([
            'cancellation_reason' => 'required|string'
        ]);

        try {
            $purchaseOrder = $this->purchaseOrderService->cancelPurchaseOrder($purchaseOrder, $request->cancellation_reason);
            return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'warehouse', 'user']));
        } catch (\Exception $e) {
            Log::error('PurchaseOrder Cancel Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to cancel purchase order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
