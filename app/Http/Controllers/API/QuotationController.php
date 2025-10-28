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

            return $quotation->refresh();
        });

        // Log activity
        ActivityLog::log(
            'CREATE_QUOTATION',
            "User created quotation {$quotation->quotation_number} for {$quotation->customer->company_name}",
            $quotation
        );

        // Create notification for admin/managers
        Notification::createForRole(
            'Admin',
            "New quotation created: {$quotation->quotation_number} for {$quotation->customer->company_name}",
            'info',
            '/quotations'
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
        $request->validate([
            'notes' => 'nullable|string|max:500'
        ]);

        $quotation = Quotation::findOrFail($id);

        if ($quotation->status !== 'SUBMITTED') {
            return response()->json([
                'message' => 'Only submitted quotations can be approved'
            ], 422);
        }

        if (!$quotation->hasPendingApproval()) {
            return response()->json([
                'message' => 'No pending approval request found for this quotation'
            ], 422);
        }

        $approval = $quotation->latestApproval();
        if ($approval->isApproved()) {
            return response()->json([
                'message' => 'Quotation is already approved'
            ], 422);
        }

        // Process approval using the approval system
        if ($quotation->approve($request->notes)) {
            // Send notification to sales user
            if ($quotation->user_id) {
                Notification::createForUser(
                    $quotation->user_id,
                    "Your quotation {$quotation->quotation_number} has been approved!",
                    'success',
                    '/quotations'
                );
            }

            // Notify admin that quotation is ready for conversion
            Notification::createForRole(
                'Admin',
                "Quotation {$quotation->quotation_number} approved and ready to convert to Sales Order",
                'info',
                '/quotations'
            );

            return response()->json($quotation->load(['customer', 'user', 'quotationItems.product', 'approvals']));
        }

        return response()->json([
            'message' => 'Failed to approve quotation'
        ], 500);
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'notes' => 'required|string|max:500'
        ]);

        $quotation = Quotation::findOrFail($id);

        if ($quotation->status !== 'SUBMITTED') {
            return response()->json([
                'message' => 'Only submitted quotations can be rejected'
            ], 422);
        }

        if (!$quotation->hasPendingApproval()) {
            return response()->json([
                'message' => 'No pending approval request found for this quotation'
            ], 422);
        }

        $approval = $quotation->latestApproval();
        if ($approval->isRejected()) {
            return response()->json([
                'message' => 'Quotation is already rejected'
            ], 422);
        }

        // Process rejection using the approval system
        if ($quotation->reject($request->notes)) {
            // Send notification to sales user
            if ($quotation->user_id) {
                Notification::createForUser(
                    $quotation->user_id,
                    "Your quotation {$quotation->quotation_number} has been rejected",
                    'warning',
                    '/quotations'
                );
            }

            return response()->json($quotation->load(['customer', 'user', 'quotationItems.product', 'approvals']));
        }

        return response()->json([
            'message' => 'Failed to reject quotation'
        ], 500);
    }

    public function createSalesOrder(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        if ($quotation->status !== 'APPROVED') {
            return response()->json([
                'message' => 'Only approved quotations can be converted to sales orders'
            ], 422);
        }

        // Check if sales order already exists for this quotation
        $existingOrder = \App\Models\SalesOrder::where('quotation_id', $id)->first();
        if ($existingOrder) {
            return response()->json([
                'message' => 'Sales order already exists for this quotation',
                'sales_order' => $existingOrder
            ], 422);
        }

        try {
            \DB::beginTransaction();

            // Create sales order
            $salesOrder = \App\Models\SalesOrder::create([
                'sales_order_number' => 'SO-' . date('Y-m-d') . '-' . str_pad(\App\Models\SalesOrder::count() + 1, 3, '0', STR_PAD_LEFT),
                'quotation_id' => $id,
                'customer_id' => $quotation->customer_id,
                'user_id' => auth()->id(),
                'status' => 'PENDING',
                'total_amount' => $quotation->total_amount,
                'notes' => $request->input('notes', ''),
            ]);

            // Copy quotation items to sales order items
            foreach ($quotation->quotationItems as $quotationItem) {
                \App\Models\SalesOrderItem::create([
                    'sales_order_id' => $salesOrder->id,
                    'product_id' => $quotationItem->product_id,
                    'quantity' => $quotationItem->quantity,
                    'unit_price' => $quotationItem->unit_price,
                    'discount_percentage' => $quotationItem->discount_percentage,
                    'tax_rate' => $quotationItem->tax_rate,
                    'total_price' => $quotationItem->total_price,
                ]);
            }

            // Quotation status remains APPROVED

            // Log activity
            ActivityLog::log(
                'CREATE_SALES_ORDER',
                "User created sales order {$salesOrder->order_number} from quotation {$quotation->quotation_number}",
                $salesOrder
            );

            // Send notification
            Notification::createForRole(
                'Gudang',
                "New sales order: {$salesOrder->order_number}",
                'info',
                '/sales-orders'
            );

            \DB::commit();

            return response()->json([
                'message' => 'Sales order created successfully',
                'sales_order' => $salesOrder->load(['customer', 'user', 'salesOrderItems.product', 'quotation'])
            ]);

        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json([
                'message' => 'Failed to create sales order',
                'error' => $e->getMessage()
            ], 500);
        }
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
