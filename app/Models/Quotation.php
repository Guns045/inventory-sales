<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number',
        'customer_id',
        'user_id',
        'status',
        'valid_until',
        'subtotal',
        'discount',
        'tax',
        'total_amount',
    ];

    protected $casts = [
        'valid_until' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function quotationItems()
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function salesOrder()
    {
        return $this->hasOne(SalesOrder::class);
    }

    public function approvals(): MorphMany
    {
        return $this->morphMany(Approval::class, 'approvable');
    }

    /**
     * Get the latest approval for this quotation
     */
    public function latestApproval()
    {
        return $this->approvals()->latest()->first();
    }

    /**
     * Check if quotation has pending approval
     */
    public function hasPendingApproval(): bool
    {
        return $this->approvals()->where('status', 'PENDING')->exists();
    }

    /**
     * Check if quotation is approved
     */
    public function isApproved(): bool
    {
        return $this->approvals()->where('status', 'APPROVED')->exists();
    }

    /**
     * Submit quotation for approval
     */
    public function submitForApproval($notes = null): Approval
    {
        $this->update(['status' => 'SUBMITTED']);

        // Check if multi-level approval is needed
        $approvalLevels = $this->getRequiredApprovalLevels();

        if ($approvalLevels->count() > 1) {
            // Multi-level approval
            return Approval::createMultiLevelRequest($this, $approvalLevels, $notes);
        } else {
            // Single-level approval (legacy)
            return Approval::createRequest($this, $notes);
        }
    }

    /**
     * Get required approval levels based on quotation amount
     */
    public function getRequiredApprovalLevels()
    {
        $rules = ApprovalRule::findApplicableRules('Quotation', $this->total_amount);

        if ($rules->isNotEmpty()) {
            // Use the first matching rule (most specific)
            $rule = $rules->first();
            return $rule->getOrderedApprovalLevels();
        }

        // Fallback to default approval levels based on amount
        return ApprovalLevel::active()
            ->where('min_amount', '<=', $this->total_amount)
            ->where(function ($query) {
                $query->whereNull('max_amount')
                      ->orWhere('max_amount', '>=', $this->total_amount);
            })
            ->ordered()
            ->get();
    }

    /**
     * Approve quotation at current level
     */
    public function approveCurrentLevel($approverNotes = null): bool
    {
        $approval = $this->getCurrentPendingApproval();
        if ($approval && $approval->isPending()) {
            return $approval->approveCurrentLevel($approverNotes);
        }
        return false;
    }

    /**
     * Reject quotation at current level
     */
    public function rejectCurrentLevel($approverNotes = null): bool
    {
        $approval = $this->getCurrentPendingApproval();
        if ($approval && $approval->isPending()) {
            return $approval->rejectCurrentLevel($approverNotes);
        }
        return false;
    }

    /**
     * Get current pending approval
     */
    public function getCurrentPendingApproval()
    {
        return Approval::getCurrentPending($this);
    }

    /**
     * Check if quotation requires multi-level approval
     */
    public function requiresMultiLevelApproval(): bool
    {
        $approvalLevels = $this->getRequiredApprovalLevels();
        return $approvalLevels->count() > 1;
    }

    /**
     * Get approval workflow status
     */
    public function getApprovalWorkflowStatus()
    {
        $currentApproval = $this->getCurrentPendingApproval();

        if (!$currentApproval) {
            $latestApproval = $this->latestApproval();
            return $latestApproval ? $latestApproval->workflow_status : null;
        }

        return $currentApproval->workflow_status;
    }

    /**
     * Get all approvals in workflow
     */
    public function getWorkflowApprovals()
    {
        return $this->approvals()->orderBy('level_order')->get();
    }

    /**
     * Check if quotation can be approved by current user
     */
    public function canBeApprovedBy($user): bool
    {
        $currentApproval = $this->getCurrentPendingApproval();

        if (!$currentApproval || !$currentApproval->isPending()) {
            return false;
        }

        $approvalLevel = $currentApproval->approvalLevel;
        if (!$approvalLevel) {
            return false;
        }

        return $user->role_id === $approvalLevel->role_id;
    }

    /**
     * Legacy methods for backward compatibility
     */
    public function approve($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            return $approval->approveCurrentLevel($approverNotes);
        }
        return false;
    }

    public function reject($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            return $approval->rejectCurrentLevel($approverNotes);
        }
        return false;
    }

    /**
     * Convert quotation to sales order
     */
    public function convertToSalesOrder($notes = null): ?SalesOrder
    {
        if (!$this->isApproved()) {
            throw new \Exception('Quotation must be approved before converting to Sales Order');
        }

        if ($this->salesOrder) {
            throw new \Exception('Quotation already converted to Sales Order');
        }

        // Generate Sales Order number
        $salesOrderNumber = 'SO-' . date('Y-m-d') . '-' . str_pad(SalesOrder::count() + 1, 3, '0', STR_PAD_LEFT);

        // Create Sales Order
        $salesOrder = SalesOrder::create([
            'sales_order_number' => $salesOrderNumber,
            'quotation_id' => $this->id,
            'customer_id' => $this->customer_id,
            'user_id' => auth()->id(),
            'status' => 'PENDING',
            'total_amount' => $this->total_amount,
            'notes' => $notes,
        ]);

        // Copy quotation items to sales order items
        foreach ($this->quotationItems as $quotationItem) {
            SalesOrderItem::create([
                'sales_order_id' => $salesOrder->id,
                'product_id' => $quotationItem->product_id,
                'quantity' => $quotationItem->quantity,
                'unit_price' => $quotationItem->unit_price,
                'discount_percentage' => $quotationItem->discount_percentage,
                'tax_rate' => $quotationItem->tax_rate,
            ]);

            // Lock stock - reserve the quantity for this sales order
            $this->reserveStock($quotationItem->product_id, $quotationItem->quantity);
        }

        // Update quotation status
        $this->update(['status' => 'CONVERTED']);

        return $salesOrder;
    }

    /**
     * Reserve stock for a product across multiple warehouses
     */
    private function reserveStock($productId, $quantity)
    {
        $remainingQuantity = $quantity;
        $stockReservations = [];

        // Get all warehouses with available stock for this product, ordered by available quantity
        $productStocks = ProductStock::where('product_id', $productId)
            ->whereRaw('(quantity - reserved_quantity) > 0')
            ->orderByRaw('(quantity - reserved_quantity) DESC')
            ->get();

        // Calculate total available stock properly
        $totalAvailableStock = 0;
        foreach ($productStocks as $stock) {
            $totalAvailableStock += ($stock->quantity - $stock->reserved_quantity);
        }

        if ($totalAvailableStock < $quantity) {
            throw new \Exception("Insufficient stock for product. Total Available: {$totalAvailableStock}, Required: {$quantity}");
        }

        // Reserve stock from warehouses with available inventory
        foreach ($productStocks as $productStock) {
            if ($remainingQuantity <= 0) break;

            $availableInWarehouse = $productStock->quantity - $productStock->reserved_quantity;
            $reserveFromWarehouse = min($remainingQuantity, $availableInWarehouse);

            if ($reserveFromWarehouse > 0) {
                // Reserve the stock in this warehouse
                $productStock->increment('reserved_quantity', $reserveFromWarehouse);

                $stockReservations[] = [
                    'warehouse_id' => $productStock->warehouse_id,
                    'quantity_reserved' => $reserveFromWarehouse
                ];

                // Log the stock movement for this warehouse
                StockMovement::create([
                    'product_id' => $productId,
                    'warehouse_id' => $productStock->warehouse_id,
                    'type' => 'RESERVATION',
                    'quantity_change' => -$reserveFromWarehouse,
                    'reference_id' => $this->id,
                    'reference_type' => Quotation::class,
                    'notes' => "Stock reserved for Sales Order conversion from Quotation #{$this->quotation_number} (Warehouse: {$productStock->warehouse->name})",
                ]);

                $remainingQuantity -= $reserveFromWarehouse;
            }
        }
    }

    /**
     * Check if quotation can be converted to Sales Order
     */
    public function canBeConverted(): bool
    {
        return $this->isApproved() && !$this->salesOrder && $this->hasAvailableStock();
    }

    /**
     * Check if all items in quotation have available stock
     */
    public function hasAvailableStock(): bool
    {
        foreach ($this->quotationItems as $item) {
            // Check total available stock across ALL warehouses using raw SQL
            $totalAvailableStock = ProductStock::where('product_id', $item->product_id)
                ->selectRaw('SUM(quantity - reserved_quantity) as available')
                ->value('available') ?? 0;

            // If total available stock is less than required quantity
            if ($totalAvailableStock < $item->quantity) {
                // Log detailed information for debugging
                \Log::error("Stock shortage for Product ID: {$item->product_id}");
                \Log::error("Product Name: " . ($item->product->name ?? 'Unknown'));
                \Log::error("Required Quantity: {$item->quantity}");
                \Log::error("Available Stock: {$totalAvailableStock}");
                \Log::error("Shortage: " . ($item->quantity - $totalAvailableStock));

                // Get detailed stock info per warehouse
                $stockDetails = ProductStock::where('product_id', $item->product_id)
                    ->with('warehouse')
                    ->get();

                \Log::error("Stock details by warehouse:");
                foreach ($stockDetails as $stock) {
                    $available = $stock->quantity - $stock->reserved_quantity;
                    \Log::error("  Warehouse: {$stock->warehouse->name} - Available: {$available}");
                }

                return false;
            }
        }

        return true;
    }
}
