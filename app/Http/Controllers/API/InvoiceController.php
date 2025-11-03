<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use Illuminate\Support\Facades\DB;
use PDF;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['customer', 'salesOrder', 'invoiceItems.product']);

        // Filter by status if provided
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        // Search functionality
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($customerQuery) use ($search) {
                      $customerQuery->where('company_name', 'like', "%{$search}%")
                                   ->orWhere('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('salesOrder', function($salesOrderQuery) use ($search) {
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
            $query->whereHas('customer', function($customerQuery) use ($customer) {
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

        $invoices = $query->orderBy('created_at', 'desc')->paginate(10);
        return response()->json($invoices);
    }

    /**
     * Export invoices to Excel
     */
    public function export(Request $request)
    {
        $query = Invoice::with(['customer', 'salesOrder', 'invoiceItems.product']);

        // Apply same filters as index method
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($customerQuery) use ($search) {
                      $customerQuery->where('company_name', 'like', "%{$search}%")
                                   ->orWhere('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('salesOrder', function($salesOrderQuery) use ($search) {
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
            $query->whereHas('customer', function($customerQuery) use ($customer) {
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

        // Create CSV data
        $csvData = [];
        $csvData[] = ['Invoice Number', 'Customer', 'Issue Date', 'Due Date', 'Total Amount', 'Status', 'Sales Order'];

        foreach ($invoices as $invoice) {
            $csvData[] = [
                $invoice->invoice_number,
                $invoice->customer->company_name ?? $invoice->customer->name ?? 'N/A',
                $invoice->issue_date->format('Y-m-d'),
                $invoice->due_date->format('Y-m-d'),
                $invoice->total_amount,
                $invoice->status,
                $invoice->salesOrder->sales_order_number ?? 'N/A'
            ];
        }

        // Create CSV content
        $csv = '';
        foreach ($csvData as $row) {
            $csv .= implode(',', array_map(function($field) {
                return '"' . str_replace('"', '""', $field) . '"';
            }, $row)) . "\n";
        }

        $filename = 'invoices-export-' . date('Y-m-d') . '.csv';

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'customer_id' => 'required|exists:customers,id',
            'issue_date' => 'required|date',
            'due_date' => 'required|date',
            'status' => 'required|in:UNPAID,PAID,PARTIAL,OVERDUE',
        ]);

        $invoice = DB::transaction(function () use ($request) {
            // Create invoice items from the sales order items first to calculate total
            $salesOrder = SalesOrder::findOrFail($request->sales_order_id);
            $salesOrderItems = $salesOrder->salesOrderItems;

            $totalAmount = 0;
            foreach ($salesOrderItems as $item) {
                $totalPrice = $item->quantity * $item->unit_price;
                $discountAmount = $totalPrice * ($item->discount_percentage / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item->tax_rate / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;
                $totalAmount += $totalPrice;
            }

            $invoice = Invoice::create([
                'invoice_number' => 'INV-' . date('Y-m') . '-' . str_pad(Invoice::count() + 1, 4, '0', STR_PAD_LEFT),
                'sales_order_id' => $request->sales_order_id,
                'customer_id' => $request->customer_id,
                'issue_date' => $request->issue_date,
                'due_date' => $request->due_date,
                'status' => $request->status,
                'total_amount' => $totalAmount,
            ]);

            // Create invoice items from the sales order items
            foreach ($salesOrderItems as $item) {
                $totalPrice = $item->quantity * $item->unit_price;
                $discountAmount = $totalPrice * ($item->discount_percentage / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item->tax_rate / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item->product_id,
                    'description' => $item->product->name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'discount_percentage' => $item->discount_percentage,
                    'tax_rate' => $item->tax_rate,
                    'total_price' => $totalPrice,
                ]);
            }

            // Update the sales order status to completed/invoiced
            $salesOrder->update(['status' => 'COMPLETED']);

            return $invoice;
        });

        return response()->json($invoice->load(['customer', 'salesOrder', 'invoiceItems.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['customer', 'salesOrder', 'invoiceItems.product'])->findOrFail($id);
        return response()->json($invoice);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'customer_id' => 'required|exists:customers,id',
            'issue_date' => 'required|date',
            'due_date' => 'required|date',
            'status' => 'required|in:UNPAID,PAID,PARTIAL,OVERDUE',
        ]);

        $invoice->update($request->all());

        return response()->json($invoice->load(['customer', 'salesOrder', 'invoiceItems.product']));
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
    public function updateStatus(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $request->validate([
            'status' => 'required|in:UNPAID,PAID,PARTIAL,OVERDUE',
            'notes' => 'nullable|string|max:500'
        ]);

        $oldStatus = $invoice->status;
        $newStatus = $request->status;

        // Business logic validation
        if ($oldStatus === 'PAID' && in_array($newStatus, ['UNPAID', 'PARTIAL'])) {
            return response()->json([
                'message' => 'Cannot change PAID invoice back to UNPAID or PARTIAL status'
            ], 422);
        }

        // Auto-update OVERDUE status based on due date
        if ($newStatus === 'PARTIAL' && $invoice->due_date < now()) {
            $newStatus = 'OVERDUE';
        }

        $notes = $request->notes ?? $invoice->notes;

        // Add status change tracking to notes
        if ($oldStatus !== $newStatus) {
            $statusChangeNote = "Status changed from {$oldStatus} to {$newStatus} on " . now()->format('Y-m-d H:i:s') . ".";
            $notes = $notes ? $notes . ' ' . $statusChangeNote : $statusChangeNote;
        }

        $invoice->update([
            'status' => $newStatus,
            'notes' => $notes
        ]);

        return response()->json([
            'message' => 'Invoice status updated successfully',
            'invoice' => $invoice->load(['customer', 'salesOrder', 'invoiceItems.product'])
        ]);
    }

    /**
     * Print invoice
     */
    public function print($id)
    {
        $invoice = Invoice::with([
            'customer',
            'salesOrder',
            'invoiceItems.product',
            'salesOrder.customer'
        ])->findOrFail($id);

        $pdf = PDF::loadView('pdf.invoice', compact('invoice'));

        return $pdf->stream('invoice-' . $invoice->invoice_number . '.pdf');
    }
}
