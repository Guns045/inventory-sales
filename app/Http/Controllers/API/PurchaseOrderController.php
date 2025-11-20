<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\DocumentCounter;
use App\Models\EmailLog;
use App\Traits\DocumentNumberHelper;
use App\Transformers\PurchaseOrderTransformer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\PurchaseOrderMail;

class PurchaseOrderController extends Controller
{
    use DocumentNumberHelper;

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
                      $sq->where('company_name', 'like', "%{$search}%");
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

        $purchaseOrders = $query->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($purchaseOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'expected_delivery_date' => 'nullable|date',
            'status' => 'required|in:DRAFT,SENT,CONFIRMED,PARTIAL_RECEIVED,COMPLETED,CANCELLED',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        $purchaseOrder = DB::transaction(function () use ($request) {
            // Generate PO number using DocumentCounter
            $poNumber = DocumentCounter::getNextNumber('PURCHASE_ORDER', $request->warehouse_id);

            $purchaseOrder = PurchaseOrder::create([
                'po_number' => $poNumber,
                'supplier_id' => $request->supplier_id,
                'warehouse_id' => $request->warehouse_id,
                'user_id' => auth()->id(),
                'status' => $request->status,
                'order_date' => now()->format('Y-m-d'),
                'expected_delivery_date' => $request->expected_delivery_date,
                'notes' => $request->notes,
            ]);

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                $totalAmount += $lineTotal;

                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'warehouse_id' => $request->warehouse_id,
                ]);
            }

            $purchaseOrder->update(['total_amount' => $totalAmount]);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Created Purchase Order',
                'description' => "Created PO {$poNumber} for supplier {$purchaseOrder->supplier->name}",
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            // Create notification for warehouse staff
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'New Purchase Order Created',
                'message' => "PO {$poNumber} has been created and ready for processing",
                'type' => 'purchase_order',
                'reference_id' => $purchaseOrder->id,
            ]);

            return $purchaseOrder->refresh();
        });

        return response()->json($purchaseOrder->load(['supplier', 'warehouse', 'user', 'items.product']), 201);
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

        return response()->json($purchaseOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        // Check if PO can be edited (only DRAFT status)
        if ($purchaseOrder->status !== 'DRAFT') {
            return response()->json(['message' => 'Only draft purchase orders can be edited'], 422);
        }

        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'expected_delivery_date' => 'nullable|date',
            'status' => 'required|in:DRAFT,SENT,CONFIRMED,CANCELLED',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        $purchaseOrder = DB::transaction(function () use ($request, $purchaseOrder) {
            $oldStatus = $purchaseOrder->status;

            $purchaseOrder->update([
                'supplier_id' => $request->supplier_id,
                'warehouse_id' => $request->warehouse_id,
                'status' => $request->status,
                'expected_delivery_date' => $request->expected_delivery_date,
                'notes' => $request->notes,
            ]);

            // Update purchase order items
            PurchaseOrderItem::where('purchase_order_id', $purchaseOrder->id)->delete();

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                $totalAmount += $lineTotal;

                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'warehouse_id' => $request->warehouse_id,
                ]);
            }

            $purchaseOrder->update(['total_amount' => $totalAmount]);

            // Log status change
            if ($oldStatus !== $purchaseOrder->status) {
                ActivityLog::create([
                    'user_id' => auth()->id(),
                    'action' => 'Updated Purchase Order Status',
                    'reference_type' => 'PurchaseOrder',
                    'reference_id' => $purchaseOrder->id,
                    'description' => "Changed PO {$purchaseOrder->po_number} status from {$oldStatus} to {$purchaseOrder->status}",
                ]);
            }

            return $purchaseOrder->refresh();
        });

        return response()->json($purchaseOrder->load(['supplier', 'warehouse', 'user', 'items.product']));
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

        DB::transaction(function () use ($purchaseOrder) {
            // Delete related items first
            $purchaseOrder->items()->delete();

            // Log activity before deletion
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Deleted Purchase Order',
                'description' => "Deleted PO {$purchaseOrder->po_number}",
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            // Delete the purchase order
            $purchaseOrder->delete();
        });

        return response()->json(['message' => 'Purchase Order deleted successfully']);
    }

    /**
     * Update purchase order status
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:DRAFT,SENT,CONFIRMED,PARTIAL_RECEIVED,COMPLETED,CANCELLED',
            'notes' => 'nullable|string',
        ]);

        $purchaseOrder = PurchaseOrder::findOrFail($id);
        $oldStatus = $purchaseOrder->status;

        DB::transaction(function () use ($request, $purchaseOrder, $oldStatus) {
            $purchaseOrder->update([
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            // Log status change
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Updated Purchase Order Status',
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
                'description' => "Changed PO {$purchaseOrder->po_number} status from {$oldStatus} to {$request->status}",
            ]);

            // Create notification if status changed to CONFIRMED
            if ($oldStatus !== 'CONFIRMED' && $request->status === 'CONFIRMED') {
                Notification::create([
                    'user_id' => auth()->id(),
                    'title' => 'Purchase Order Confirmed',
                    'message' => "PO {$purchaseOrder->po_number} has been confirmed and ready for goods receipt",
                    'type' => 'purchase_order',
                    'reference_id' => $purchaseOrder->id,
                ]);
            }
        });

        return response()->json($purchaseOrder->load(['supplier', 'warehouse', 'user']));
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
            ->where(function($q) {
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
        return response()->json($purchaseOrders);
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
        ActivityLog::log(
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

        // Create email log
        $emailLog = EmailLog::create([
            'user_id' => auth()->id(),
            'type' => 'purchase_order',
            'reference_id' => $purchaseOrder->id,
            'reference_type' => PurchaseOrder::class,
            'recipient_email' => $request->recipient_email,
            'subject' => "Purchase Order {$purchaseOrder->po_number} from PT. Jinan Truck Power Indonesia",
            'message' => $request->custom_message,
            'status' => 'pending'
        ]);

        try {
            // Send email
            Mail::to($request->recipient_email)
                ->send(new PurchaseOrderMail($purchaseOrder, $request->custom_message));

            // Update PO status to SENT (valid enum value)
            $purchaseOrder->update(['status' => 'SENT']);

            // Update email log status
            $emailLog->markAsSent();

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Sent Purchase Order',
                'description' => "Sent PO {$purchaseOrder->po_number} to {$request->recipient_email}",
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            return response()->json([
                'message' => 'Purchase Order sent successfully',
                'po_number' => $purchaseOrder->po_number,
                'status' => $purchaseOrder->status,
                'email_log_id' => $emailLog->id
            ]);

        } catch (\Exception $e) {
            // Update email log status to failed
            $emailLog->markAsFailed($e->getMessage());

            return response()->json([
                'message' => 'Failed to send Purchase Order',
                'error' => $e->getMessage(),
                'email_log_id' => $emailLog->id
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

        DB::transaction(function () use ($request, $purchaseOrder) {
            $oldStatus = $purchaseOrder->status;

            $purchaseOrder->update([
                'status' => 'CANCELLED',
                'notes' => ($purchaseOrder->notes ?? '') . "\n\nCancellation Reason: " . $request->cancellation_reason
            ]);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Cancelled Purchase Order',
                'description' => "Cancelled PO {$purchaseOrder->po_number}. Previous status: {$oldStatus}. Cancellation Reason: " . $request->cancellation_reason,
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Purchase Order Cancelled',
                'message' => "PO {$purchaseOrder->po_number} has been cancelled",
                'type' => 'purchase_order',
                'reference_id' => $purchaseOrder->id,
            ]);
        });

        return response()->json($purchaseOrder->load(['supplier', 'warehouse', 'user']));
    }
}
