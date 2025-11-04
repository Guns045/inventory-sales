<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\Approval;
use Illuminate\Support\Facades\DB;
use PDF;
use Excel;
use App\Exports\QuotationExport;

class QuotationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $quotations = Quotation::with(['customer', 'user', 'quotationItems.product', 'approvals'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);
        return response()->json($quotations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        \Log::info('=== QUOTATION STORE REQUEST ===');
        \Log::info('Request Data:', $request->all());

        try {
            $request->validate([
                'customer_id' => 'required|exists:customers,id',
                'valid_until' => 'required|date',
                'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,REJECTED',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Quotation Store Validation Error:');
            \Log::error('Field Errors:', $e->errors());
            \Log::error('Request Data:', $request->all());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }

        $quotation = DB::transaction(function () use ($request) {
            $quotation = Quotation::create([
                'quotation_number' => 'Q-' . date('Y-m') . '-' . str_pad(Quotation::count() + 1, 4, '0', STR_PAD_LEFT),
                'customer_id' => $request->customer_id,
                'user_id' => auth()->id(),
                'status' => $request->status,
                'valid_until' => $request->valid_until,
            ]);

            // Validate items array first
            if (!isset($request->items) || !is_array($request->items) || count($request->items) === 0) {
                \Log::error('Items validation failed: No items provided');
                return response()->json([
                    'message' => 'Items array is required and must contain at least one item',
                    'errors' => [
                        'items' => ['At least one item is required']
                    ]
                ], 422);
            }

            // Create quotation items
            foreach ($request->items as $index => $item) {
                try {
                    $request->validate([
                        "items.{$index}.product_id" => 'required|exists:products,id',
                        "items.{$index}.quantity" => 'required|integer|min:1',
                        "items.{$index}.unit_price" => 'required|numeric|min:0',
                        "items.{$index}.discount_percentage" => 'required|numeric|min:0|max:100',
                        "items.{$index}.tax_rate" => 'required|numeric|min:0',
                    ]);
                } catch (\Illuminate\Validation\ValidationException $e) {
                    \Log::error("Items validation failed for item {$index}:");
                    \Log::error("Item Data:", $item);
                    \Log::error("Field Errors:", $e->errors());
                    return response()->json([
                        'message' => "Validation failed for item " . ($index + 1),
                        'errors' => $e->errors(),
                        'item_data' => $item
                    ], 422);
                }

                $totalPrice = $item['quantity'] * $item['unit_price'];
                $discountAmount = $totalPrice * ($item['discount_percentage'] / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item['tax_rate'] / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'],
                    'tax_rate' => $item['tax_rate'],
                    'total_price' => $totalPrice,
                ]);
            }

            // Calculate totals
            $subtotal = $quotation->quotationItems->sum('total_price');
            $totalAmount = $subtotal; // In this implementation, subtotal and total are the same after tax

            $quotation->update([
                'subtotal' => $subtotal,
                'total_amount' => $totalAmount,
            ]);

            // If status is SUBMITTED, create approval record
            if ($quotation->status === 'SUBMITTED') {
                // Create approval record manually to handle auth context properly
                Approval::create([
                    'user_id' => auth()->id(),
                    'approvable_type' => Quotation::class,
                    'approvable_id' => $quotation->id,
                    'status' => 'PENDING',
                    'notes' => null,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            }

            return $quotation->refresh();
        });

        // Log activity
        ActivityLog::log(
            'CREATE_QUOTATION',
            "User created quotation {$quotation->quotation_number} for {$quotation->customer->company_name}",
            $quotation
        );

        // Create notification for admin/managers
        $notificationMessage = $quotation->status === 'SUBMITTED'
            ? "New quotation {$quotation->quotation_number} submitted for approval"
            : "New quotation created: {$quotation->quotation_number} for {$quotation->customer->company_name}";

        $notificationPath = $quotation->status === 'SUBMITTED' ? '/approvals' : '/quotations';

        Notification::createForRole(
            'Admin',
            $notificationMessage,
            'info',
            $notificationPath
        );

        return response()->json($quotation->load(['customer', 'user', 'quotationItems.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $quotation = Quotation::with(['customer', 'user', 'quotationItems.product'])->findOrFail($id);
        return response()->json($quotation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        // Only allow editing DRAFT quotations
        if ($quotation->status !== 'DRAFT') {
            return response()->json([
                'message' => 'Only draft quotations can be edited'
            ], 422);
        }

        // Validate items array first
        if (!isset($request->items) || !is_array($request->items) || count($request->items) === 0) {
            \Log::error('Update Items validation failed: No items provided');
            return response()->json([
                'message' => 'Items array is required and must contain at least one item',
                'errors' => [
                    'items' => ['At least one item is required for quotation update']
                ]
            ], 422);
        }

        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'valid_until' => 'required|date',
            'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,REJECTED',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
            'items.*.tax_rate' => 'required|numeric|min:0',
        ]);

        $quotation = DB::transaction(function () use ($request, $quotation) {
            $quotation->update([
                'customer_id' => $request->customer_id,
                'status' => $request->status,
                'valid_until' => $request->valid_until,
            ]);

            // Update quotation items
            QuotationItem::where('quotation_id', $quotation->id)->delete();

            foreach ($request->items as $item) {

                $totalPrice = $item['quantity'] * $item['unit_price'];
                $discountAmount = $totalPrice * ($item['discount_percentage'] / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item['tax_rate'] / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'],
                    'tax_rate' => $item['tax_rate'],
                    'total_price' => $totalPrice,
                ]);
            }

            // Calculate totals
            $subtotal = $quotation->quotationItems->sum('total_price');
            $totalAmount = $subtotal;
            
            $quotation->update([
                'subtotal' => $subtotal,
                'total_amount' => $totalAmount,
            ]);

            return $quotation->refresh();
        });

        return response()->json($quotation->load(['customer', 'user', 'quotationItems.product']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $quotation = Quotation::findOrFail($id);

        // Prevent deletion of approved quotations
        if ($quotation->status === 'APPROVED') {
            return response()->json([
                'message' => 'Approved quotations cannot be deleted'
            ], 422);
        }

        // Prevent deletion of submitted quotations
        if ($quotation->status === 'SUBMITTED') {
            return response()->json([
                'message' => 'Submitted quotations cannot be deleted'
            ], 422);
        }

        $quotation->delete();

        return response()->json(['message' => 'Quotation deleted successfully']);
    }

    public function getQuotationItems($id)
    {
        $quotation = Quotation::with('quotationItems.product')->findOrFail($id);
        return response()->json($quotation->quotationItems);
    }

    public function submit(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:500'
        ]);

        $quotation = Quotation::findOrFail($id);

        if ($quotation->status === 'SUBMITTED') {
            return response()->json([
                'message' => 'Quotation is already submitted for approval'
            ], 422);
        }

        if ($quotation->status === 'APPROVED') {
            return response()->json([
                'message' => 'Quotation is already approved'
            ], 422);
        }

        if ($quotation->status === 'REJECTED') {
            return response()->json([
                'message' => 'Rejected quotations cannot be resubmitted. Please create a new quotation.'
            ], 422);
        }

        try {
            // Submit for approval
            $approval = $quotation->submitForApproval($request->notes);

            // Send notification to admin users
            Notification::createForRole(
                'Admin',
                "New quotation {$quotation->quotation_number} submitted for approval",
                'info',
                '/approvals'
            );

            return response()->json([
                'message' => 'Quotation submitted for approval successfully',
                'quotation' => $quotation->load(['customer', 'user', 'quotationItems.product', 'approvals'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to submit quotation for approval: ' . $e->getMessage()
            ], 500);
        }
    }

    public function approve(Request $request, $id)
    {
        try {
            \Log::info('=== QUOTATION APPROVE REQUEST ===');
            \Log::info('Quotation ID: ' . $id);
            \Log::info('Request Data:', $request->all());
            \Log::info('Auth User ID: ' . auth()->id());

            $request->validate([
                'notes' => 'nullable|string|max:500'
            ]);

            $quotation = Quotation::findOrFail($id);
            \Log::info('Quotation found:', [
                'id' => $quotation->id,
                'status' => $quotation->status,
                'quotation_number' => $quotation->quotation_number
            ]);

            if ($quotation->status !== 'SUBMITTED') {
                \Log::warning('Quotation status is not SUBMITTED: ' . $quotation->status);
                return response()->json([
                    'message' => 'Only submitted quotations can be approved',
                    'current_status' => $quotation->status
                ], 422);
            }

            // Check if user can approve this quotation
            if (!$quotation->canBeApprovedBy(auth()->user())) {
                \Log::warning('User is not authorized to approve this quotation');
                return response()->json([
                    'message' => 'You are not authorized to approve this quotation'
                ], 403);
            }

            if (!$quotation->hasPendingApproval()) {
                \Log::warning('No pending approval found for quotation');
                return response()->json([
                    'message' => 'No pending approval request found for this quotation'
                ], 422);
            }

            $currentApproval = $quotation->getCurrentPendingApproval();
            if ($currentApproval && $currentApproval->isApproved()) {
                \Log::warning('Quotation already approved at this level');
                return response()->json([
                    'message' => 'This approval level is already completed'
                ], 422);
            }

            \Log::info('Processing approval...');
            // Process approval using the multi-level approval system
            if ($quotation->approveCurrentLevel($request->notes)) {
                \Log::info('Approval successful');

                // Check if this is final approval
                $isFinalApproval = $quotation->isApproved();
                $workflowStatus = $quotation->getApprovalWorkflowStatus();

                // Send notifications based on approval status
                if ($isFinalApproval) {
                    // Final approval - notify sales user
                    if ($quotation->user_id) {
                        Notification::createForUser(
                            $quotation->user_id,
                            "Your quotation {$quotation->quotation_number} has been fully approved!",
                            'success',
                            '/quotations'
                        );
                    }

                    // Notify admin that quotation is ready for conversion
                    Notification::createForRole(
                        'Admin',
                        "Quotation {$quotation->quotation_number} fully approved and ready to convert to Sales Order",
                        'info',
                        '/quotations'
                    );
                } else {
                    // Partial approval - notify next level approver
                    $nextApproval = $quotation->getCurrentPendingApproval();
                    if ($nextApproval && $nextApproval->nextApprover) {
                        Notification::createForUser(
                            $nextApproval->nextApprover->id,
                            "Quotation {$quotation->quotation_number} is ready for your approval (Level {$nextApproval->level_order})",
                            'info',
                            '/approvals'
                        );
                    }
                }

                return response()->json([
                    'message' => $isFinalApproval
                        ? 'Quotation fully approved successfully'
                        : 'Quotation approved at current level and moved to next level',
                    'quotation' => $quotation->load(['customer', 'user', 'quotationItems.product', 'approvals.approvalLevel']),
                    'is_final_approval' => $isFinalApproval,
                    'workflow_status' => $workflowStatus
                ]);
            }

            \Log::error('Approval process failed');
            return response()->json([
                'message' => 'Failed to approve quotation'
            ], 500);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Quotation Approve Validation Error:');
            \Log::error('Field Errors:', $e->errors());
            \Log::error('Request Data:', $request->all());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Quotation Approve Error: ' . $e->getMessage());
            \Log::error('Stack Trace:', $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to approve quotation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            \Log::info('=== QUOTATION REJECT REQUEST ===');
            \Log::info('Quotation ID: ' . $id);
            \Log::info('Request Data:', $request->all());
            \Log::info('Auth User ID: ' . auth()->id());

            $request->validate([
                'notes' => 'required|string|max:500'
            ]);

            $quotation = Quotation::findOrFail($id);
            \Log::info('Quotation found:', [
                'id' => $quotation->id,
                'status' => $quotation->status,
                'quotation_number' => $quotation->quotation_number
            ]);

            if ($quotation->status !== 'SUBMITTED') {
                \Log::warning('Quotation status is not SUBMITTED: ' . $quotation->status);
                return response()->json([
                    'message' => 'Only submitted quotations can be rejected',
                    'current_status' => $quotation->status
                ], 422);
            }

            // Check if user can approve this quotation
            if (!$quotation->canBeApprovedBy(auth()->user())) {
                \Log::warning('User is not authorized to reject this quotation');
                return response()->json([
                    'message' => 'You are not authorized to reject this quotation'
                ], 403);
            }

            if (!$quotation->hasPendingApproval()) {
                \Log::warning('No pending approval found for quotation');
                return response()->json([
                    'message' => 'No pending approval request found for this quotation'
                ], 422);
            }

            $currentApproval = $quotation->getCurrentPendingApproval();
            if ($currentApproval && $currentApproval->isRejected()) {
                \Log::warning('Quotation already rejected at this level');
                return response()->json([
                    'message' => 'This approval level is already completed'
                ], 422);
            }

            \Log::info('Processing rejection...');
            // Process rejection using the multi-level approval system
            if ($quotation->rejectCurrentLevel($request->notes)) {
                \Log::info('Rejection successful');

                // Send notification to sales user
                if ($quotation->user_id) {
                    Notification::createForUser(
                        $quotation->user_id,
                        "Your quotation {$quotation->quotation_number} has been rejected",
                        'warning',
                        '/quotations'
                    );
                }

                return response()->json([
                    'message' => 'Quotation rejected successfully',
                    'quotation' => $quotation->load(['customer', 'user', 'quotationItems.product', 'approvals.approvalLevel']),
                    'workflow_status' => $quotation->getApprovalWorkflowStatus()
                ]);
            }

            \Log::error('Rejection process failed');
            return response()->json([
                'message' => 'Failed to reject quotation'
            ], 500);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Quotation Reject Validation Error:');
            \Log::error('Field Errors:', $e->errors());
            \Log::error('Request Data:', $request->all());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Quotation Reject Error: ' . $e->getMessage());
            \Log::error('Stack Trace:', $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to reject quotation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createSalesOrder(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        // Check if quotation can be converted (approved, has available stock, not already converted)
        if (!$quotation->canBeConverted()) {
            $message = 'Cannot convert quotation to sales order. ';

            if (!$quotation->isApproved()) {
                $message .= 'Quotation must be approved first.';
            } elseif ($quotation->salesOrder) {
                $message .= 'Quotation already converted to sales order.';
            } elseif (!$quotation->hasAvailableStock()) {
                $message .= 'Insufficient stock for one or more items.';
            }

            return response()->json([
                'message' => $message,
                'can_convert' => false
            ], 422);
        }

        try {
            \DB::beginTransaction();

            // Use the model method to convert quotation to sales order
            $salesOrder = $quotation->convertToSalesOrder($request->input('notes', ''));

            // Update quotation status to CONVERTED
            $quotation->update(['status' => 'CONVERTED']);

            // Log activity
            ActivityLog::log(
                'CREATE_SALES_ORDER',
                "User created sales order {$salesOrder->sales_order_number} from quotation {$quotation->quotation_number}",
                $salesOrder
            );

            // Send notification to warehouse team
            Notification::createForRole(
                'Gudang',
                "New sales order: {$salesOrder->sales_order_number}",
                'info',
                '/sales-orders'
            );

            // Send notification to admin
            Notification::createForRole(
                'Admin',
                "Sales Order {$salesOrder->sales_order_number} created from Quotation {$quotation->quotation_number}",
                'info',
                '/sales-orders'
            );

            \DB::commit();

            return response()->json([
                'message' => 'Sales order created successfully and stock has been reserved',
                'sales_order' => $salesOrder->load(['customer', 'user', 'salesOrderItems.product', 'quotation']),
                'stock_reserved' => true
            ]);

        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json([
                'message' => 'Failed to create sales order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if quotation can be converted to sales order
     */
    public function checkConvertibility($id)
    {
        $quotation = Quotation::with(['quotationItems.product', 'customer'])->findOrFail($id);

        $stockDetails = [];

        // Get detailed stock information for each item
        foreach ($quotation->quotationItems as $item) {
            $totalAvailable = \App\Models\ProductStock::where('product_id', $item->product_id)
                ->selectRaw('SUM(quantity - reserved_quantity) as available')
                ->value('available') ?? 0;

            $warehouseStocks = \App\Models\ProductStock::where('product_id', $item->product_id)
                ->with('warehouse')
                ->get()
                ->map(function($stock) {
                    return [
                        'warehouse_name' => $stock->warehouse->name,
                        'quantity' => $stock->quantity,
                        'reserved_quantity' => $stock->reserved_quantity,
                        'available' => $stock->quantity - $stock->reserved_quantity
                    ];
                });

            $stockDetails[] = [
                'product_id' => $item->product_id,
                'product_name' => $item->product->name ?? 'Unknown',
                'required_quantity' => $item->quantity,
                'total_available' => $totalAvailable,
                'shortage' => max(0, $item->quantity - $totalAvailable),
                'can_fulfill' => $totalAvailable >= $item->quantity,
                'warehouse_stocks' => $warehouseStocks
            ];
        }

        return response()->json([
            'can_convert' => $quotation->canBeConverted(),
            'is_approved' => $quotation->isApproved(),
            'has_sales_order' => $quotation->salesOrder !== null,
            'has_available_stock' => $quotation->hasAvailableStock(),
            'status' => $quotation->status,
            'reasons' => $this->getConvertibilityReasons($quotation),
            'stock_details' => $stockDetails
        ]);
    }

    /**
     * Get reasons why quotation cannot be converted
     */
    private function getConvertibilityReasons($quotation): array
    {
        $reasons = [];

        if (!$quotation->isApproved()) {
            $reasons[] = 'Quotation must be approved first';
        }

        if ($quotation->salesOrder) {
            $reasons[] = 'Quotation already converted to sales order';
        }

        if (!$quotation->hasAvailableStock()) {
            $reasons[] = 'Insufficient stock for one or more items';
        }

        return $reasons;
    }

    public function exportPDF($id)
    {
        $quotation = Quotation::with(['customer', 'user', 'quotationItems.product'])->findOrFail($id);

        $pdf = PDF::loadView('pdf.quotation', compact('quotation'));

        // Log activity
        ActivityLog::log(
            'EXPORT_QUOTATION_PDF',
            "User exported quotation {$quotation->quotation_number} to PDF",
            $quotation
        );

        return $pdf->download("quotation-{$quotation->quotation_number}.pdf");
    }

    public function exportExcel($id)
    {
        $quotation = Quotation::with(['customer', 'user', 'quotationItems.product'])->findOrFail($id);

        // Log activity
        ActivityLog::log(
            'EXPORT_QUOTATION_EXCEL',
            "User exported quotation {$quotation->quotation_number} to Excel",
            $quotation
        );

        return Excel::download(new QuotationExport($quotation), "quotation-{$quotation->quotation_number}.xlsx");
    }
}
