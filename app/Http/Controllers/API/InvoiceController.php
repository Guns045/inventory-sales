<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $invoices = Invoice::with(['customer', 'salesOrder', 'invoiceItems.product'])->paginate(10);
        return response()->json($invoices);
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
            'status' => 'required|in:UNPAID,PAID,OVERDUE',
        ]);

        $invoice = DB::transaction(function () use ($request) {
            $invoice = Invoice::create([
                'invoice_number' => 'INV-' . date('Y-m') . '-' . str_pad(Invoice::count() + 1, 4, '0', STR_PAD_LEFT),
                'sales_order_id' => $request->sales_order_id,
                'customer_id' => $request->customer_id,
                'issue_date' => $request->issue_date,
                'due_date' => $request->due_date,
                'status' => $request->status,
            ]);

            // Create invoice items from the sales order items
            $salesOrder = SalesOrder::findOrFail($request->sales_order_id);
            $salesOrderItems = $salesOrder->salesOrderItems;

            $totalAmount = 0;
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

                $totalAmount += $totalPrice;
            }

            // Update the invoice with the calculated total
            $invoice->update(['total_amount' => $totalAmount]);

            // Update the sales order status to completed/invoiced
            $salesOrder->update(['status' => 'COMPLETED']);

            return $invoice->refresh();
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
            'status' => 'required|in:UNPAID,PAID,OVERDUE',
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
}
