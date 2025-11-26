<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\DocumentCounter;
use App\Models\EmailLog;
use App\Mail\PurchaseOrderMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class PurchaseOrderService
{
    /**
     * Create a new purchase order
     *
     * @param array $data
     * @return PurchaseOrder
     */
    public function createPurchaseOrder(array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($data) {
            // Generate PO number using DocumentCounter
            $poNumber = DocumentCounter::getNextNumber('PURCHASE_ORDER', $data['warehouse_id']);

            $purchaseOrder = PurchaseOrder::create([
                'po_number' => $poNumber,
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'user_id' => auth()->id(),
                'status' => $data['status'],
                'order_date' => now()->format('Y-m-d'),
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->createItems($purchaseOrder, $data['items']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Created Purchase Order',
                'description' => "Created PO {$poNumber} for supplier {$purchaseOrder->supplier->name}",
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            // Create notification for warehouse staff
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'New Purchase Order Created',
                'message' => "PO {$poNumber} has been created and ready for processing",
                'type' => 'purchase_order',
                'reference_id' => $purchaseOrder->id,
            ]);

            return $purchaseOrder->load(['supplier', 'warehouse', 'user', 'items.product']);
        });
    }

    /**
     * Update an existing purchase order
     *
     * @param PurchaseOrder $purchaseOrder
     * @param array $data
     * @return PurchaseOrder
     */
    public function updatePurchaseOrder(PurchaseOrder $purchaseOrder, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($purchaseOrder, $data) {
            $oldStatus = $purchaseOrder->status;

            $purchaseOrder->update([
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'status' => $data['status'],
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Update purchase order items
            $purchaseOrder->items()->delete();
            $this->createItems($purchaseOrder, $data['items']);

            // Log status change
            if ($oldStatus !== $purchaseOrder->status) {
                ActivityLog::create([
                    'user_id' => auth()->id(),
                    'action' => 'Updated Purchase Order Status',
                    'reference_type' => 'PurchaseOrder',
                    'reference_id' => $purchaseOrder->id,
                    'description' => "Changed PO {$purchaseOrder->po_number} status from {$oldStatus} to {$purchaseOrder->status}",
                ]);
            }

            return $purchaseOrder->refresh()->load(['supplier', 'warehouse', 'user', 'items.product']);
        });
    }

    /**
     * Update purchase order status
     *
     * @param PurchaseOrder $purchaseOrder
     * @param string $status
     * @param string|null $notes
     * @return PurchaseOrder
     */
    public function updateStatus(PurchaseOrder $purchaseOrder, string $status, ?string $notes = null): PurchaseOrder
    {
        return DB::transaction(function () use ($purchaseOrder, $status, $notes) {
            $oldStatus = $purchaseOrder->status;

            $updateData = ['status' => $status];
            if ($notes) {
                $updateData['notes'] = $notes;
            }

            $purchaseOrder->update($updateData);

            // Log status change
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Updated Purchase Order Status',
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
                'description' => "Changed PO {$purchaseOrder->po_number} status from {$oldStatus} to {$status}",
            ]);

            // Create notification if status changed to CONFIRMED
            if ($oldStatus !== 'CONFIRMED' && $status === 'CONFIRMED') {
                Notification::create([
                    'user_id' => auth()->id(),
                    'title' => 'Purchase Order Confirmed',
                    'message' => "PO {$purchaseOrder->po_number} has been confirmed and ready for goods receipt",
                    'type' => 'purchase_order',
                    'reference_id' => $purchaseOrder->id,
                ]);
            }

            return $purchaseOrder;
        });
    }

    /**
     * Cancel purchase order
     *
     * @param PurchaseOrder $purchaseOrder
     * @param string $reason
     * @return PurchaseOrder
     */
    public function cancelPurchaseOrder(PurchaseOrder $purchaseOrder, string $reason): PurchaseOrder
    {
        return DB::transaction(function () use ($purchaseOrder, $reason) {
            $oldStatus = $purchaseOrder->status;

            $purchaseOrder->update([
                'status' => 'CANCELLED',
                'notes' => ($purchaseOrder->notes ?? '') . "\n\nCancellation Reason: " . $reason
            ]);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Cancelled Purchase Order',
                'description' => "Cancelled PO {$purchaseOrder->po_number}. Previous status: {$oldStatus}. Cancellation Reason: " . $reason,
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Purchase Order Cancelled',
                'message' => "PO {$purchaseOrder->po_number} has been cancelled",
                'type' => 'purchase_order',
                'reference_id' => $purchaseOrder->id,
            ]);

            return $purchaseOrder;
        });
    }

    /**
     * Send Purchase Order via email
     *
     * @param PurchaseOrder $purchaseOrder
     * @param string $recipientEmail
     * @param string|null $customMessage
     * @return array
     * @throws \Exception
     */
    public function sendPurchaseOrder(PurchaseOrder $purchaseOrder, string $recipientEmail, ?string $customMessage = null): array
    {
        // Create email log
        $emailLog = EmailLog::create([
            'user_id' => auth()->id(),
            'type' => 'purchase_order',
            'reference_id' => $purchaseOrder->id,
            'reference_type' => PurchaseOrder::class,
            'recipient_email' => $recipientEmail,
            'subject' => "Purchase Order {$purchaseOrder->po_number} from PT. Jinan Truck Power Indonesia",
            'message' => $customMessage,
            'status' => 'pending'
        ]);

        try {
            // Send email
            Mail::to($recipientEmail)
                ->send(new PurchaseOrderMail($purchaseOrder, $customMessage));

            // Update PO status to SENT
            $purchaseOrder->update(['status' => 'SENT']);

            // Update email log status
            $emailLog->markAsSent();

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Sent Purchase Order',
                'description' => "Sent PO {$purchaseOrder->po_number} to {$recipientEmail}",
                'reference_type' => 'PurchaseOrder',
                'reference_id' => $purchaseOrder->id,
            ]);

            return [
                'success' => true,
                'email_log_id' => $emailLog->id
            ];

        } catch (\Exception $e) {
            // Update email log status to failed
            $emailLog->markAsFailed($e->getMessage());
            throw $e;
        }
    }

    private function createItems(PurchaseOrder $purchaseOrder, array $items)
    {
        $totalAmount = 0;
        foreach ($items as $item) {
            $lineTotal = $item['quantity'] * $item['unit_price'];
            $totalAmount += $lineTotal;

            PurchaseOrderItem::create([
                'purchase_order_id' => $purchaseOrder->id,
                'product_id' => $item['product_id'],
                'quantity_ordered' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'warehouse_id' => $purchaseOrder->warehouse_id,
                'notes' => $item['notes'] ?? null,
            ]);
        }

        $purchaseOrder->update(['total_amount' => $totalAmount]);
    }
}
