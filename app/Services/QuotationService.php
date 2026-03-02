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
                'terms_of_payment' => $data['terms_of_payment'] ?? null,
                'po_number' => $data['po_number'] ?? null,
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
                'terms_of_payment' => $data['terms_of_payment'] ?? null,
                'po_number' => $data['po_number'] ?? null,
            ]);

            // If already reserved, release old reservation first
            $wasReserved = $quotation->is_reserved;
            if ($wasReserved) {
                $this->inventoryService->releaseReservedStockForQuotation($quotation);
            }

            // Replace items
            $quotation->quotationItems()->delete();
            $this->createQuotationItems($quotation, $data['items']);
            $this->calculateTotals($quotation);

            // Re-reserve if it was previously reserved
            if ($wasReserved) {
                foreach ($quotation->quotationItems as $item) {
                    $this->inventoryService->reserveStock($item->product_id, $item->quantity, $quotation);
                }
                $quotation->update(['is_reserved' => true]);
            }

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
            // $taxAmount = ($totalPrice - $discountAmount) * ($item['tax_rate'] / 100);
            // Total price for item should be before tax as per user request
            $lineTotal = $totalPrice - $discountAmount;

            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'discount_percentage' => $item['discount_percentage'],
                'tax_rate' => $item['tax_rate'],
                'total_price' => $lineTotal,
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
        $items = $quotation->quotationItems;
        $subtotal = 0;
        $totalTax = 0;

        foreach ($items as $item) {
            $subtotal += $item->total_price;
            $totalTax += $item->total_price * ($item->tax_rate / 100);
        }

        $quotation->update([
            'subtotal' => $subtotal,
            'total_amount' => $subtotal + $totalTax,
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
            'Super Admin',
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
    /**
     * Manually reserve stock for a quotation
     *
     * @param Quotation $quotation
     * @return Quotation
     * @throws \Exception
     */
    public function reserveStock(Quotation $quotation): Quotation
    {
        if ($quotation->is_reserved) {
            throw new \Exception('Stock is already reserved for this quotation');
        }

        return DB::transaction(function () use ($quotation) {
            $quotation = Quotation::where('id', $quotation->id)->lockForUpdate()->first();

            if ($quotation->is_reserved) {
                throw new \Exception('Stock is already reserved for this quotation');
            }

            foreach ($quotation->quotationItems as $item) {
                $this->inventoryService->reserveStock($item->product_id, $item->quantity, $quotation);
            }

            $quotation->update(['is_reserved' => true]);

            // Log activity
            ActivityLog::log(
                'RESERVE_QUOTATION_STOCK',
                "Manually reserved stock for quotation {$quotation->quotation_number}",
                $quotation
            );

            return $quotation;
        });
    }

    /**
     * Manually unreserve stock for a quotation
     *
     * @param Quotation $quotation
     * @return Quotation
     * @throws \Exception
     */
    public function unreserveStock(Quotation $quotation): Quotation
    {
        if (!$quotation->is_reserved) {
            throw new \Exception('Stock is not reserved for this quotation');
        }

        return DB::transaction(function () use ($quotation) {
            $quotation = Quotation::where('id', $quotation->id)->lockForUpdate()->first();

            if (!$quotation->is_reserved) {
                throw new \Exception('Stock is not reserved for this quotation');
            }

            $this->inventoryService->releaseReservedStockForQuotation($quotation);

            $quotation->update(['is_reserved' => false]);

            // Log activity
            ActivityLog::log(
                'UNRESERVE_QUOTATION_STOCK',
                "Manually unreserved stock for quotation {$quotation->quotation_number}",
                $quotation
            );

            return $quotation;
        });
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
            // Lock the quotation row to prevent race conditions (double click)
            $quotation = Quotation::where('id', $quotation->id)->lockForUpdate()->first();

            if ($quotation->salesOrder) {
                throw new \Exception('Quotation already converted to Sales Order');
            }
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
                'po_number' => $quotation->po_number,
                'terms_of_payment' => $quotation->terms_of_payment,
            ]);

            // Copy items
            foreach ($quotation->quotationItems as $quotationItem) {
                SalesOrderItem::create([
                    'sales_order_id' => $salesOrder->id,
                    'product_id' => $quotationItem->product_id,
                    'quantity' => $quotationItem->quantity,
                    'unit_price' => $quotationItem->unit_price,
                    'discount_percentage' => $quotationItem->discount_percentage,
                    'tax_rate' => $quotationItem->tax_rate,
                ]);

                // Reserve stock via InventoryService if NOT ALREADY reserved
                if (!$quotation->is_reserved) {
                    $this->inventoryService->reserveStock($quotationItem->product_id, $quotationItem->quantity, $quotation);
                }
            }

            // Update quotation status
            $quotation->update([
                'status' => 'CONVERTED',
                'is_reserved' => true // Always true after conversion
            ]);

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
