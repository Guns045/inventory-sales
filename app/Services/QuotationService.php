<?php

namespace App\Services;

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Approval;
use App\Models\ApprovalLevel;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Traits\DocumentNumberHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class QuotationService
{
    use DocumentNumberHelper;

    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * Create a new quotation
     *
     * @param array $data
     * @return Quotation
     */
    public function createQuotation(array $data): Quotation
    {
        return DB::transaction(function () use ($data) {
            $warehouseId = $data['warehouse_id'];

            $quotation = Quotation::create([
                'quotation_number' => $this->generateQuotationNumber($warehouseId),
                'customer_id' => $data['customer_id'],
                'user_id' => auth()->id(),
                'warehouse_id' => $warehouseId,
                'status' => $data['status'],
                'valid_until' => $data['valid_until'],
            ]);

            $this->createQuotationItems($quotation, $data['items']);
            $this->calculateTotals($quotation);

            // Handle submission if status is SUBMITTED
            if ($quotation->status === 'SUBMITTED') {
                $this->initiateApprovalProcess($quotation);
            }

            // Log activity
            ActivityLog::log(
                'CREATE_QUOTATION',
                "User created quotation {$quotation->quotation_number} for {$quotation->customer->company_name}",
                $quotation
            );

            // Create notification
            $this->sendCreationNotification($quotation);

            return $quotation->refresh();
        });
    }

    /**
     * Update an existing quotation
     *
     * @param Quotation $quotation
     * @param array $data
     * @return Quotation
     */
    public function updateQuotation(Quotation $quotation, array $data): Quotation
    {
        return DB::transaction(function () use ($quotation, $data) {
            $quotation->update([
                'customer_id' => $data['customer_id'],
                'warehouse_id' => $data['warehouse_id'],
                'status' => $data['status'],
                'valid_until' => $data['valid_until'],
            ]);

            // Replace items
            $quotation->quotationItems()->delete();
            $this->createQuotationItems($quotation, $data['items']);
            $this->calculateTotals($quotation);

            return $quotation->refresh();
        });
    }

    /**
     * Create items for a quotation
     *
     * @param Quotation $quotation
     * @param array $items
     */
    private function createQuotationItems(Quotation $quotation, array $items)
    {
        foreach ($items as $item) {
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
    }

    /**
     * Calculate and update quotation totals
     *
     * @param Quotation $quotation
     */
    private function calculateTotals(Quotation $quotation)
    {
        $subtotal = $quotation->quotationItems()->sum('total_price');
        // In this implementation, subtotal and total are the same after tax logic in items
        $totalAmount = $subtotal;

        $quotation->update([
            'subtotal' => $subtotal,
            'total_amount' => $totalAmount,
        ]);
    }

    /**
     * Initiate the approval process
     *
     * @param Quotation $quotation
     */
    private function initiateApprovalProcess(Quotation $quotation)
    {
        $totalAmount = $quotation->total_amount;

        // Find appropriate approval level based on amount
        $approvalLevel = ApprovalLevel::where('min_amount', '<=', $totalAmount)
            ->where(function ($query) use ($totalAmount) {
                $query->whereNull('max_amount')
                    ->orWhere('max_amount', '>=', $totalAmount);
            })
            ->first();

        // Create approval record
        Approval::create([
            'user_id' => auth()->id(),
            'approvable_type' => Quotation::class,
            'approvable_id' => $quotation->id,
            'approval_level_id' => $approvalLevel ? $approvalLevel->id : null,
            'level_order' => $approvalLevel ? $approvalLevel->level_order : 1,
            'status' => 'PENDING',
            'workflow_status' => 'IN_PROGRESS',
            'notes' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Send notification after creation
     *
     * @param Quotation $quotation
     */
    private function sendCreationNotification(Quotation $quotation)
    {
        $notificationMessage = $quotation->status === 'SUBMITTED'
            ? "New quotation {$quotation->quotation_number} submitted for approval"
            : "New quotation created: {$quotation->quotation_number} for {$quotation->customer->company_name}";

        $notificationPath = $quotation->status === 'SUBMITTED' ? '/approvals' : '/quotations';

        Notification::createForRole(
            'Admin',
            $notificationMessage,
            'info',
            $notificationPath
        );
    }

    /**
     * Convert quotation to sales order
     *
     * @param Quotation $quotation
     * @param string|null $notes
     * @return SalesOrder
     * @throws \Exception
     */
    public function convertToSalesOrder(Quotation $quotation, ?string $notes = null): SalesOrder
    {
        if (!$quotation->isApproved()) {
            throw new \Exception('Quotation must be approved before converting to Sales Order');
        }

        if ($quotation->salesOrder) {
            throw new \Exception('Quotation already converted to Sales Order');
        }

        return DB::transaction(function () use ($quotation, $notes) {
            // Use the quotation's warehouse_id for consistent warehouse assignment
            $warehouseId = $quotation->warehouse_id;
            $salesOrderNumber = $this->generateSalesOrderNumber($warehouseId);

            // Create Sales Order
            $salesOrder = SalesOrder::create([
                'sales_order_number' => $salesOrderNumber,
                'quotation_id' => $quotation->id,
                'customer_id' => $quotation->customer_id,
                'user_id' => auth()->id() ?: $quotation->user_id,
                'warehouse_id' => $warehouseId,
                'status' => 'PENDING',
                'total_amount' => $quotation->total_amount,
                'notes' => $notes,
            ]);

            // Copy items and reserve stock
            foreach ($quotation->quotationItems as $quotationItem) {
                SalesOrderItem::create([
                    'sales_order_id' => $salesOrder->id,
                    'product_id' => $quotationItem->product_id,
                    'quantity' => $quotationItem->quantity,
                    'unit_price' => $quotationItem->unit_price,
                    'discount_percentage' => $quotationItem->discount_percentage,
                    'tax_rate' => $quotationItem->tax_rate,
                ]);

                // Reserve stock via InventoryService
                $this->inventoryService->reserveStock($quotationItem->product_id, $quotationItem->quantity, $quotation);
            }

            // Update quotation status
            $quotation->update(['status' => 'CONVERTED']);

            // Log activity
            ActivityLog::log(
                'CREATE_SALES_ORDER',
                "User created sales order {$salesOrder->sales_order_number} from quotation {$quotation->quotation_number}",
                $salesOrder
            );

            return $salesOrder;
        });
    }
}
