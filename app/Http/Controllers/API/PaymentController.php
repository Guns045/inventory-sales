<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\UpdatePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\Invoice;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    protected $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Payment::with(['invoice', 'invoice.customer']);

        // Filter by invoice_id if provided
        if ($request->has('invoice_id') && !empty($request->invoice_id)) {
            $query->where('invoice_id', $request->invoice_id);
        }

        $payments = $query->orderBy('payment_date', 'desc')->paginate(10);
        return PaymentResource::collection($payments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePaymentRequest $request)
    {
        try {
            $invoice = Invoice::findOrFail($request->invoice_id);
            $payment = $this->paymentService->recordPayment($invoice, $request->validated());
            return new PaymentResource($payment);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $payment = Payment::with(['invoice', 'invoice.customer'])->findOrFail($id);
        return new PaymentResource($payment);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePaymentRequest $request, $id)
    {
        try {
            $payment = Payment::findOrFail($id);
            $payment = $this->paymentService->updatePayment($payment, $request->validated());
            return new PaymentResource($payment);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $payment = Payment::with('invoice')->findOrFail($id);
            $this->paymentService->deletePayment($payment);
            return response()->json(['message' => 'Payment deleted successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment summary for an invoice
     */
    public function getInvoiceSummary($invoiceId)
    {
        try {
            $invoice = Invoice::with('payments')->findOrFail($invoiceId);
            $summary = $this->paymentService->getPaymentSummary($invoice);
            return response()->json($summary);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to get payment summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
