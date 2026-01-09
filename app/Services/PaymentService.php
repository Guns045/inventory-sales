<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Invoice;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    /**
     * Record a payment and auto-update invoice status
     *
     * @param Invoice $invoice
     * @param array $data
     * @return Payment
     * @throws \Exception
     */
    public function recordPayment(Invoice $invoice, array $data): Payment
    {
        return DB::transaction(function () use ($invoice, $data) {
            // Validate amount does not exceed remaining balance
            $remainingBalance = $this->getRemainingBalance($invoice);
            if ($data['amount_paid'] > $remainingBalance) {
                throw new \Exception("Payment amount ({$data['amount_paid']}) exceeds remaining balance ({$remainingBalance})");
            }

            // Handle Credit Note
            if (isset($data['credit_note_id']) && $data['credit_note_id']) {
                $creditNote = \App\Models\CreditNote::findOrFail($data['credit_note_id']);

                if ($creditNote->customer_id !== $invoice->customer_id) {
                    throw new \Exception("Credit Note belongs to a different customer.");
                }

                if ($creditNote->status !== 'ISSUED') {
                    throw new \Exception("Credit Note is not in ISSUED status.");
                }

                if ($data['amount_paid'] > $creditNote->total_amount) {
                    throw new \Exception("Payment amount cannot exceed Credit Note amount.");
                }

                // Mark Credit Note as USED and link to Invoice
                $creditNote->update([
                    'status' => 'USED',
                    'invoice_id' => $invoice->id
                ]);

                $data['payment_method'] = 'Credit Note';
                $data['reference_number'] = $creditNote->credit_note_number;
            }

            // Create payment
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'payment_date' => $data['payment_date'],
                'amount_paid' => $data['amount_paid'],
                'payment_method' => $data['payment_method'],
                'reference_number' => $data['reference_number'] ?? null,
            ]);

            // Handle Finance Transaction (Money In)
            if (isset($data['finance_account_id']) && $data['finance_account_id']) {
                $account = \App\Models\FinanceAccount::findOrFail($data['finance_account_id']);

                \App\Models\FinanceTransaction::create([
                    'finance_account_id' => $account->id,
                    'type' => 'IN',
                    'amount' => $data['amount_paid'],
                    'transaction_date' => $data['payment_date'],
                    'description' => "Payment for Invoice {$invoice->invoice_number}",
                    'reference_type' => Payment::class,
                    'reference_id' => $payment->id,
                    'category' => 'Sales',
                    'created_by' => auth()->id()
                ]);

                // Update Account Balance
                $account->increment('balance', $data['amount_paid']);
            }

            // Recalculate and update invoice status
            $this->updateInvoiceStatus($invoice);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Recorded Payment',
                'description' => "Recorded payment of {$data['amount_paid']} for invoice {$invoice->invoice_number} via {$data['payment_method']}",
                'reference_type' => 'Payment',
                'reference_id' => $payment->id,
            ]);

            // Send notification if invoice is now PAID
            if ($invoice->fresh()->status === 'PAID') {
                Notification::create([
                    'user_id' => auth()->id(),
                    'title' => 'Invoice Fully Paid',
                    'message' => "Invoice {$invoice->invoice_number} has been fully paid",
                    'type' => 'success',
                    'module' => 'Payment',
                    'data_id' => $payment->id,
                    'read' => false,
                ]);
            }

            return $payment->load(['invoice', 'invoice.customer']);
        });
    }

    /**
     * Update a payment and recalculate invoice status
     *
     * @param Payment $payment
     * @param array $data
     * @return Payment
     * @throws \Exception
     */
    public function updatePayment(Payment $payment, array $data): Payment
    {
        return DB::transaction(function () use ($payment, $data) {
            $invoice = $payment->invoice;

            // Calculate remaining balance excluding current payment
            $otherPaymentsTotal = $invoice->payments()
                ->where('id', '!=', $payment->id)
                ->sum('amount_paid');
            $remainingBalance = $invoice->total_amount - $otherPaymentsTotal;

            // Validate new amount does not exceed remaining balance
            if ($data['amount_paid'] > $remainingBalance) {
                throw new \Exception("Payment amount ({$data['amount_paid']}) exceeds remaining balance ({$remainingBalance})");
            }

            $oldAmount = $payment->amount_paid;
            $payment->update($data);

            // Recalculate and update invoice status
            $this->updateInvoiceStatus($invoice);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Updated Payment',
                'description' => "Updated payment for invoice {$invoice->invoice_number} from {$oldAmount} to {$data['amount_paid']}",
                'reference_type' => 'Payment',
                'reference_id' => $payment->id,
            ]);

            return $payment->load(['invoice', 'invoice.customer']);
        });
    }

    /**
     * Delete a payment and recalculate invoice status
     *
     * @param Payment $payment
     * @return void
     */
    public function deletePayment(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $invoice = $payment->invoice;
            $amount = $payment->amount_paid;

            // Log activity before deletion
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Deleted Payment',
                'description' => "Deleted payment of {$amount} for invoice {$invoice->invoice_number}",
                'reference_type' => 'Payment',
                'reference_id' => $payment->id,
            ]);

            $payment->delete();

            // Recalculate and update invoice status
            $this->updateInvoiceStatus($invoice);
        });
    }

    /**
     * Calculate and update invoice status based on payments
     *
     * @param Invoice $invoice
     * @return void
     */
    public function updateInvoiceStatus(Invoice $invoice): void
    {
        $totalPayments = $this->getTotalPaid($invoice);
        $totalAmount = $invoice->total_amount;
        $dueDate = $invoice->due_date;

        if ($totalPayments >= $totalAmount) {
            // Fully paid
            $newStatus = 'PAID';
        } elseif ($totalPayments > 0 && $totalPayments < $totalAmount) {
            // Partial payment
            if ($dueDate < now()) {
                $newStatus = 'OVERDUE';
            } else {
                $newStatus = 'PARTIAL';
            }
        } elseif ($dueDate < now() && $totalPayments < $totalAmount) {
            // No payment or insufficient payment past due date
            $newStatus = 'OVERDUE';
        } else {
            // No payment
            $newStatus = 'UNPAID';
        }

        $invoice->update(['status' => $newStatus]);
    }

    /**
     * Get total amount paid for an invoice
     *
     * @param Invoice $invoice
     * @return float
     */
    public function getTotalPaid(Invoice $invoice): float
    {
        return $invoice->payments()->sum('amount_paid');
    }

    /**
     * Get remaining balance for an invoice
     *
     * @param Invoice $invoice
     * @return float
     */
    public function getRemainingBalance(Invoice $invoice): float
    {
        $totalPaid = $this->getTotalPaid($invoice);
        return max(0, $invoice->total_amount - $totalPaid);
    }

    /**
     * Get payment summary for an invoice
     *
     * @param Invoice $invoice
     * @return array
     */
    public function getPaymentSummary(Invoice $invoice): array
    {
        $totalPaid = $this->getTotalPaid($invoice);
        $remainingBalance = $this->getRemainingBalance($invoice);

        return [
            'total_amount' => $invoice->total_amount,
            'total_paid' => $totalPaid,
            'remaining_balance' => $remainingBalance,
            'payment_status' => $invoice->status,
            'payments_count' => $invoice->payments()->count(),
            'is_fully_paid' => $totalPaid >= $invoice->total_amount,
            'is_overdue' => $invoice->due_date < now() && $totalPaid < $invoice->total_amount,
        ];
    }

    /**
     * Check if invoice can be deleted (no payments recorded)
     *
     * @param Invoice $invoice
     * @return bool
     */
    public function canBeDeleted(Invoice $invoice): bool
    {
        return $invoice->payments()->count() === 0;
    }
}
