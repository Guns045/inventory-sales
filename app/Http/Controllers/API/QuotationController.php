<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuotationRequest;
use App\Http\Requests\UpdateQuotationRequest;
use App\Http\Resources\QuotationResource;
use App\Models\Quotation;
use App\Services\QuotationService;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    protected $quotationService;

    public function __construct(QuotationService $quotationService)
    {
        $this->quotationService = $quotationService;
    }

    /**
     * Get rejection reasons for dropdown/popup
     */
    public function getRejectionReasons()
    {
        $reasons = [
            ['value' => 'No FU', 'label' => 'No FU (No Follow Up)'],
            ['value' => 'No Stock', 'label' => 'No Stock'],
            ['value' => 'Price', 'label' => 'Price Issue']
        ];

        return response()->json([
            'data' => $reasons,
            'message' => 'Rejection reasons retrieved successfully'
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Quotation::with(['customer', 'user', 'warehouse', 'quotationItems.product', 'approvals'])
            ->orderBy('created_at', 'desc');

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by warehouse if provided
        if ($request->has('warehouse_id') && !empty($request->warehouse_id) && $request->warehouse_id !== 'all') {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        // Search functionality
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('company_name', 'like', "%{$search}%");
                    });
            });
        }

        $quotations = $query->paginate(2000);
        return QuotationResource::collection($quotations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreQuotationRequest $request)
    {
        try {
            $quotation = $this->quotationService->createQuotation($request->validated());
            return new QuotationResource($quotation->load(['customer', 'user', 'warehouse', 'quotationItems.product']));
        } catch (\Exception $e) {
            \Log::error('Quotation Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create quotation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $quotation = Quotation::with(['customer', 'user', 'warehouse', 'quotationItems.product', 'approvals.approvalLevel', 'approvals.approver'])->findOrFail($id);
        return new QuotationResource($quotation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateQuotationRequest $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        // Allow editing DRAFT and REJECTED quotations (for Sales Team to resubmit)
        if (!in_array($quotation->status, ['DRAFT', 'REJECTED'])) {
            return response()->json([
                'message' => 'Only draft and rejected quotations can be edited'
            ], 422);
        }

        try {
            $quotation = $this->quotationService->updateQuotation($quotation, $request->validated());
            return new QuotationResource($quotation->load(['customer', 'user', 'warehouse', 'quotationItems.product']));
        } catch (\Exception $e) {
            \Log::error('Quotation Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update quotation',
                'error' => $e->getMessage()
            ], 500);
        }
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

        if ($quotation->status === 'CONVERTED') {
            return response()->json([
                'message' => 'Quotation is already converted to Sales Order'
            ], 422);
        }

        try {
            // Submit for approval using model method (keeping this for now as it wasn't moved to service yet)
            // Ideally this should also be in service
            $approval = $quotation->submitForApproval($request->notes);

            // Send notification to admin users
            \App\Models\Notification::createForRole(
                'Admin',
                "New quotation {$quotation->quotation_number} submitted for approval",
                'info',
                '/approvals'
            );

            return response()->json([
                'message' => 'Quotation submitted for approval successfully',
                'quotation' => new QuotationResource($quotation->load(['customer', 'user', 'warehouse', 'quotationItems.product', 'approvals']))
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
            $request->validate([
                'notes' => 'nullable|string|max:500'
            ]);

            $quotation = Quotation::findOrFail($id);

            if ($quotation->status !== 'SUBMITTED') {
                return response()->json([
                    'message' => 'Only submitted quotations can be approved',
                    'current_status' => $quotation->status
                ], 422);
            }

            // Check if user can approve this quotation
            if (!$quotation->canBeApprovedBy(auth()->user())) {
                return response()->json([
                    'message' => 'You are not authorized to approve this quotation'
                ], 403);
            }

            // Simple approval - just update status
            $quotation->update([
                'status' => 'APPROVED'
            ]);

            // Update approval record if exists (for simple flow)
            $approval = $quotation->latestApproval();
            if ($approval && $approval->status === 'PENDING') {
                $approval->approve($request->notes);
            }

            // Log activity
            \App\Models\ActivityLog::log(
                'APPROVE_QUOTATION',
                "Approved quotation {$quotation->quotation_number}",
                $quotation
            );

            return response()->json([
                'message' => 'Quotation approved successfully',
                'quotation' => new QuotationResource($quotation->load(['customer', 'user', 'warehouse', 'quotationItems.product']))
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to approve quotation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $request->validate([
                'notes' => 'nullable|string|max:500',
                'reason_type' => 'required|in:No FU,No Stock,Price'
            ]);

            $quotation = Quotation::findOrFail($id);

            if ($quotation->status !== 'SUBMITTED') {
                return response()->json([
                    'message' => 'Only submitted quotations can be rejected',
                    'current_status' => $quotation->status
                ], 422);
            }

            // Check if user can approve this quotation
            if (!$quotation->canBeApprovedBy(auth()->user())) {
                return response()->json([
                    'message' => 'You are not authorized to reject this quotation'
                ], 403);
            }

            if (!$quotation->hasPendingApproval()) {
                return response()->json([
                    'message' => 'No pending approval request found for this quotation'
                ], 422);
            }

            // Try multi-level rejection first (if applicable)
            $currentApproval = $quotation->getCurrentPendingApproval();
            if ($currentApproval) {
                if ($currentApproval->isRejected()) {
                    return response()->json([
                        'message' => 'This approval level is already completed'
                    ], 422);
                }

                // Process rejection using the multi-level approval system
                if ($quotation->rejectCurrentLevel($request->notes, $request->reason_type)) {
                    // Send notification to sales user
                    if ($quotation->user_id) {
                        \App\Models\Notification::createForUser(
                            $quotation->user_id,
                            "Your quotation {$quotation->quotation_number} has been rejected",
                            'warning',
                            '/quotations'
                        );
                    }

                    return response()->json([
                        'message' => 'Quotation rejected successfully',
                        'quotation' => new QuotationResource($quotation->load(['customer', 'user', 'warehouse', 'quotationItems.product', 'approvals.approvalLevel'])),
                        'workflow_status' => $quotation->getApprovalWorkflowStatus()
                    ]);
                }
            } else {
                // Fallback for simple rejection (no multi-level workflow found)
                $approval = $quotation->latestApproval();
                if ($approval && $approval->status === 'PENDING') {
                    $approval->reject($request->notes);
                }

                $quotation->update(['status' => 'REJECTED']);

                // Send notification to sales user
                if ($quotation->user_id) {
                    \App\Models\Notification::createForUser(
                        $quotation->user_id,
                        "Your quotation {$quotation->quotation_number} has been rejected",
                        'warning',
                        '/quotations'
                    );
                }

                return response()->json([
                    'message' => 'Quotation rejected successfully',
                    'quotation' => new QuotationResource($quotation->load(['customer', 'user', 'warehouse', 'quotationItems.product'])),
                ]);
            }

            return response()->json([
                'message' => 'Failed to reject quotation'
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to reject quotation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function cancel(Request $request, $id)
    {
        try {
            $request->validate([
                'notes' => 'nullable|string|max:500'
            ]);

            $quotation = Quotation::findOrFail($id);

            if ($quotation->status !== 'APPROVED') {
                return response()->json([
                    'message' => 'Only approved quotations can be cancelled',
                    'current_status' => $quotation->status
                ], 422);
            }

            $quotation->update([
                'status' => 'CANCELLED',
                'notes' => $quotation->notes . "\n[Cancelled]: " . $request->notes
            ]);

            // Log activity
            \App\Models\ActivityLog::log(
                'CANCEL_QUOTATION',
                "Cancelled quotation {$quotation->quotation_number}",
                $quotation
            );

            return response()->json([
                'message' => 'Quotation cancelled successfully',
                'quotation' => new QuotationResource($quotation->load(['customer', 'user', 'warehouse', 'quotationItems.product']))
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to cancel quotation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createSalesOrder(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        try {
            $salesOrder = $this->quotationService->convertToSalesOrder($quotation, $request->input('notes', ''));

            return response()->json([
                'message' => 'Sales order created successfully and stock has been reserved',
                'sales_order' => $salesOrder->load(['customer', 'user', 'salesOrderItems.product', 'quotation']),
                'stock_reserved' => true
            ]);

        } catch (\Exception $e) {
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

        // Use InventoryService to get stock details
        // Note: We need to instantiate InventoryService here or inject it into the controller
        // For now, we'll use the service container to resolve it
        $inventoryService = app(\App\Services\InventoryService::class);

        $stockDetails = [];
        foreach ($quotation->quotationItems as $item) {
            $details = $inventoryService->getStockDetails($item->product_id);

            $stockDetails[] = [
                'product_id' => $item->product_id,
                'product_name' => $item->product->name ?? 'Unknown',
                'required_quantity' => $item->quantity,
                'total_available' => $details['total_available'],
                'shortage' => max(0, $item->quantity - $details['total_available']),
                'can_fulfill' => $details['total_available'] >= $item->quantity,
                'warehouse_stocks' => $details['warehouse_stocks']
            ];
        }

        return response()->json([
            'can_convert' => $quotation->canBeConverted() && $inventoryService->checkStockAvailability($quotation->quotationItems),
            'is_approved' => $quotation->isApproved(),
            'has_sales_order' => $quotation->salesOrder !== null,
            'has_available_stock' => $inventoryService->checkStockAvailability($quotation->quotationItems),
            'status' => $quotation->status,
            'stock_details' => $stockDetails
        ]);
    }

    public function exportPDF($id)
    {
        $quotation = Quotation::with(['customer', 'user', 'quotationItems.product'])->findOrFail($id);

        $pdf = \PDF::loadView('pdf.quotation', compact('quotation'));

        // Log activity
        \App\Models\ActivityLog::log(
            'EXPORT_QUOTATION_PDF',
            "User exported quotation {$quotation->quotation_number} to PDF",
            $quotation
        );

        // Safe filename - replace invalid characters
        $safeNumber = str_replace(['/', '\\'], '_', $quotation->quotation_number);
        return $pdf->download("quotation-{$safeNumber}.pdf");
    }

    /**
     * Print quotation dengan template baru
     */
    public function print($id)
    {
        // Load quotation dengan relationships
        $quotation = Quotation::with([
            'customer',
            'user',
            'quotationItems.product',
            'warehouse'
        ])->findOrFail($id);

        // Transform data untuk template
        $quotationData = \App\Transformers\QuotationTransformer::transform($quotation);
        $companyData = \App\Transformers\QuotationTransformer::getCompanyData();

        // Log activity
        \App\Models\ActivityLog::log(
            'PRINT_QUOTATION_PDF',
            "User printed quotation {$quotation->quotation_number}",
            $quotation
        );

        // Generate PDF dengan template baru
        $pdf = \PDF::loadView('pdf.quotation', [
            'company' => $companyData,
            'quotation' => $quotationData
        ])->setPaper('a4', 'portrait');

        // Safe filename
        $safeNumber = str_replace(['/', '\\'], '_', $quotation->quotation_number);
        return $pdf->stream("quotation-{$safeNumber}.pdf");
    }

    public function exportExcel($id)
    {
        $quotation = Quotation::with(['customer', 'user', 'quotationItems.product'])->findOrFail($id);

        // Log activity
        \App\Models\ActivityLog::log(
            'EXPORT_QUOTATION_EXCEL',
            "User exported quotation {$quotation->quotation_number} to Excel",
            $quotation
        );

        return \Excel::download(new \App\Exports\QuotationExport($quotation), "quotation-{$quotation->quotation_number}.xlsx");
    }
}
