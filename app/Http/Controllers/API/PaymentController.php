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
        try {
            $query = Payment::select('payments.*')
                ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
                ->join('customers', 'invoices.customer_id', '=', 'customers.id')
                ->with(['invoice', 'invoice.customer']);

            // Filter by invoice_id if provided
            if ($request->has('invoice_id') && !empty($request->invoice_id)) {
                $query->where('payments.invoice_id', $request->invoice_id);
            }

            // Filter by payment method
            if ($request->has('method') && !empty($request->method) && $request->method !== 'all') {
                $query->where('payments.payment_method', $request->method);
            }

            // Filter by date range
            if ($request->has('date_from') && !empty($request->date_from)) {
                $query->whereDate('payments.payment_date', '>=', $request->date_from);
            }
            if ($request->has('date_to') && !empty($request->date_to)) {
                $query->whereDate('payments.payment_date', '<=', $request->date_to);
            }

            // Search functionality
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('payments.reference_number', 'like', "%{$search}%")
                        ->orWhere('invoices.invoice_number', 'like', "%{$search}%")
                        ->orWhere('customers.company_name', 'like', "%{$search}%")
                        ->orWhere('customers.contact_person', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 10);
            $payments = $query->orderBy('payments.payment_date', 'desc')->paginate($perPage);
            return PaymentResource::collection($payments);

        } catch (\Exception $e) {
            Log::error('Payment Search Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred while fetching payments.',
                'error' => $e->getMessage()
            ], 500);
        }
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
