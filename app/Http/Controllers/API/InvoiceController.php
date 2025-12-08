<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Http\Requests\UpdateInvoiceStatusRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    protected $invoiceService;

    public function __construct(InvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['customer', 'salesOrder', 'invoiceItems.product', 'warehouse', 'payments']);

        // Filter by status if provided
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        // Search functionality
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('company_name', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('salesOrder', function ($salesOrderQuery) use ($search) {
                        $salesOrderQuery->where('sales_order_number', 'like', "%{$search}%");
                    });
            });
        }

        // Date range filter
        if ($request->has('date_from') && !empty($request->date_from)) {
            $query->whereDate('issue_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && !empty($request->date_to)) {
            $query->whereDate('issue_date', '<=', $request->date_to);
        }

        // Customer filter
        if ($request->has('customer') && !empty($request->customer)) {
            $customer = $request->customer;
            $query->whereHas('customer', function ($customerQuery) use ($customer) {
                $customerQuery->where('company_name', 'like', "%{$customer}%")
                    ->orWhere('name', 'like', "%{$customer}%");
            });
        }

        // Amount range filter
        if ($request->has('min_amount') && !empty($request->min_amount)) {
            $query->where('total_amount', '>=', floatval($request->min_amount));
        }
        if ($request->has('max_amount') && !empty($request->max_amount)) {
            $query->where('total_amount', '<=', floatval($request->max_amount));
        }

        $invoices = $query->orderBy('created_at', 'desc')->paginate(2000);
        return InvoiceResource::collection($invoices);
    }

    /**
     * Export invoices to Excel/CSV
     */
    public function export(Request $request)
    {
        $query = Invoice::with(['customer', 'salesOrder', 'invoiceItems.product', 'warehouse']);

        // Apply same filters as index method
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('company_name', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('salesOrder', function ($salesOrderQuery) use ($search) {
                        $salesOrderQuery->where('sales_order_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->has('date_from') && !empty($request->date_from)) {
            $query->whereDate('issue_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && !empty($request->date_to)) {
            $query->whereDate('issue_date', '<=', $request->date_to);
        }

        if ($request->has('customer') && !empty($request->customer)) {
            $customer = $request->customer;
            $query->whereHas('customer', function ($customerQuery) use ($customer) {
                $customerQuery->where('company_name', 'like', "%{$customer}%")
                    ->orWhere('name', 'like', "%{$customer}%");
            });
        }

        if ($request->has('min_amount') && !empty($request->min_amount)) {
            $query->where('total_amount', '>=', floatval($request->min_amount));
        }
        if ($request->has('max_amount') && !empty($request->max_amount)) {
            $query->where('total_amount', '<=', floatval($request->max_amount));
        }

        $invoices = $query->orderBy('created_at', 'desc')->get();

        // Generate CSV using service
        $csv = $this->invoiceService->exportToCSV($invoices);

        $filename = 'invoices-export-' . date('Y-m-d') . '.csv';

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Get sales orders ready for invoicing (SHIPPED status)
     */
    public function getReadyToCreate()
    {
        $shippedSalesOrders = SalesOrder::with(['customer', 'salesOrderItems.product', 'user'])
            ->whereIn('status', ['SHIPPED', 'COMPLETED'])
            ->whereDoesntHave('invoice')
            ->orderBy('updated_at', 'desc')
            ->paginate(10);

        return response()->json($shippedSalesOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreInvoiceRequest $request)
    {
        try {
            $invoice = $this->invoiceService->createFromSalesOrder(
                $request->sales_order_id,
                $request->validated()
            );
            return new InvoiceResource($invoice);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['customer', 'salesOrder', 'invoiceItems.product', 'warehouse', 'payments'])->findOrFail($id);

        // Fetch available credit notes for this invoice's sales order
        $availableCreditNotes = \App\Models\CreditNote::where('status', 'ISSUED')
            ->whereHas('salesReturn', function ($query) use ($invoice) {
                $query->where('sales_order_id', $invoice->sales_order_id);
            })
            ->get();

        return (new InvoiceResource($invoice))->additional([
            'available_credit_notes' => $availableCreditNotes
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateInvoiceRequest $request, $id)
    {
        try {
            $invoice = Invoice::findOrFail($id);
            $invoice = $this->invoiceService->updateInvoice($invoice, $request->validated());
            return new InvoiceResource($invoice);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted successfully']);
    }

    public function getInvoiceItems($id)
    {
        $invoice = Invoice::with('invoiceItems.product')->findOrFail($id);
        return response()->json($invoice->invoiceItems);
    }

    /**
     * Update invoice status
     */
    public function updateStatus(UpdateInvoiceStatusRequest $request, $id)
    {
        try {
            $invoice = Invoice::findOrFail($id);
            $invoice = $this->invoiceService->updateStatus($invoice, $request->status, $request->notes);

            return response()->json([
                'message' => 'Invoice status updated successfully',
                'invoice' => new InvoiceResource($invoice)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Print invoice
     */
    public function print($id)
    {
        try {
            $invoice = Invoice::findOrFail($id);
            $pdf = $this->invoiceService->generatePDF($invoice);

            $safeNumber = str_replace(['/', '\\'], '_', $invoice->invoice_number);
            return $pdf->stream('invoice-' . $safeNumber . '.pdf');
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating PDF: ' . $e->getMessage()
            ], 500);
        }
    }
}
