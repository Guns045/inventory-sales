<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Payment;
use App\Models\Invoice;

class PaymentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $payments = Payment::with(['invoice', 'invoice.customer'])->paginate(10);
        return response()->json($payments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'payment_date' => 'required|date',
            'amount_paid' => 'required|numeric|min:0',
            'payment_method' => 'required|string|max:50',
            'reference_number' => 'nullable|string|max:100',
        ]);

        $payment = Payment::create($request->all());

        // Update invoice status based on payment
        $invoice = Invoice::findOrFail($request->invoice_id);
        $totalPayments = $invoice->payments()->sum('amount_paid');
        
        if ($totalPayments >= $invoice->total_amount) {
            $invoice->update(['status' => 'PAID']);
        } elseif ($invoice->due_date < now() && $totalPayments < $invoice->total_amount) {
            $invoice->update(['status' => 'OVERDUE']);
        } else {
            $invoice->update(['status' => 'UNPAID']);
        }

        return response()->json($payment->load(['invoice', 'invoice.customer']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $payment = Payment::with(['invoice', 'invoice.customer'])->findOrFail($id);
        return response()->json($payment);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $payment = Payment::findOrFail($id);

        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'payment_date' => 'required|date',
            'amount_paid' => 'required|numeric|min:0',
            'payment_method' => 'required|string|max:50',
            'reference_number' => 'nullable|string|max:100',
        ]);

        $payment->update($request->all());

        // Update invoice status based on payment
        $invoice = Invoice::findOrFail($request->invoice_id);
        $totalPayments = $invoice->payments()->sum('amount_paid');
        
        if ($totalPayments >= $invoice->total_amount) {
            $invoice->update(['status' => 'PAID']);
        } elseif ($invoice->due_date < now() && $totalPayments < $invoice->total_amount) {
            $invoice->update(['status' => 'OVERDUE']);
        } else {
            $invoice->update(['status' => 'UNPAID']);
        }

        return response()->json($payment->load(['invoice', 'invoice.customer']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $payment = Payment::findOrFail($id);
        $payment->delete();

        // Update invoice status after payment deletion
        $invoice = $payment->invoice;
        $totalPayments = $invoice->payments()->sum('amount_paid');
        
        if ($totalPayments >= $invoice->total_amount) {
            $invoice->update(['status' => 'PAID']);
        } elseif ($invoice->due_date < now() && $totalPayments < $invoice->total_amount) {
            $invoice->update(['status' => 'OVERDUE']);
        } else {
            $invoice->update(['status' => 'UNPAID']);
        }

        return response()->json(['message' => 'Payment deleted successfully']);
    }
}
