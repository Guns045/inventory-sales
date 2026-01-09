<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\FinanceTransaction;
use App\Models\FinanceAccount;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;

class PurchaseOrderPaymentService
{
    /**
     * Record a payment for a Purchase Order (Money Out)
     */
    public function recordPayment(PurchaseOrder $purchaseOrder, array $data)
    {
        return DB::transaction(function () use ($purchaseOrder, $data) {
            // Validate amount does not exceed remaining balance
            $remainingBalance = $this->getRemainingBalance($purchaseOrder);
            if ($data['amount_paid'] > $remainingBalance) {
                throw new \Exception("Payment amount ({$data['amount_paid']}) exceeds remaining balance ({$remainingBalance})");
            }

            // Handle Finance Transaction (Money Out)
            if (isset($data['finance_account_id']) && $data['finance_account_id']) {
                $account = FinanceAccount::findOrFail($data['finance_account_id']);

                // Check if account has enough balance
                if ($account->balance < $data['amount_paid']) {
                    throw new \Exception("Insufficient balance in account {$account->name}. Current balance: {$account->balance}");
                }

                FinanceTransaction::create([
                    'finance_account_id' => $account->id,
                    'type' => 'OUT',
                    'amount' => $data['amount_paid'],
                    'transaction_date' => $data['payment_date'],
                    'description' => "Payment for PO {$purchaseOrder->po_number}",
                    'reference_type' => PurchaseOrder::class,
                    'reference_id' => $purchaseOrder->id,
                    'category' => 'Purchase',
                    'created_by' => auth()->id()
                ]);

                // Update Account Balance
                $account->decrement('balance', $data['amount_paid']);
            }

            // Update PO Paid Amount
            $purchaseOrder->increment('paid_amount', $data['amount_paid']);

            // Update PO Payment Status
            $this->updatePaymentStatus($purchaseOrder);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Recorded PO Payment',
                'description' => "Recorded payment of {$data['amount_paid']} for PO {$purchaseOrder->po_number}",
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            return $purchaseOrder->fresh();
        });
    }

    public function getRemainingBalance(PurchaseOrder $purchaseOrder)
    {
        return max(0, $purchaseOrder->total_amount - $purchaseOrder->paid_amount);
    }

    public function updatePaymentStatus(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->paid_amount >= $purchaseOrder->total_amount) {
            $purchaseOrder->payment_status = 'PAID';
        } elseif ($purchaseOrder->paid_amount > 0) {
            $purchaseOrder->payment_status = 'PARTIAL';
        } else {
            $purchaseOrder->payment_status = 'UNPAID';
        }
        $purchaseOrder->save();
    }
}
