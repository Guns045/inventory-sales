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
        return Approval::createRequest($this, $notes);
    }

    /**
     * Approve quotation
     */
    public function approve($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            $approval->approve($approverNotes);
            $this->update(['status' => 'APPROVED']);
            return true;
        }
        return false;
    }

    /**
     * Reject quotation
     */
    public function reject($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            $approval->reject($approverNotes);
            $this->update(['status' => 'REJECTED']);
            return true;
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
     * Reserve stock for a product
     */
    private function reserveStock($productId, $quantity)
    {
        // Get the default warehouse (you might want to make this configurable)
        $defaultWarehouse = Warehouse::first() ?? Warehouse::create(['name' => 'Default Warehouse', 'location' => 'Default Location']);

        $productStock = ProductStock::where('product_id', $productId)
            ->where('warehouse_id', $defaultWarehouse->id)
            ->first();

        if (!$productStock) {
            throw new \Exception("Product stock not found for product ID: {$productId}");
        }

        // Check if enough stock is available
        $availableStock = $productStock->quantity - $productStock->reserved_quantity;
        if ($availableStock < $quantity) {
            throw new \Exception("Insufficient stock for product. Available: {$availableStock}, Required: {$quantity}");
        }

        // Reserve the stock
        $productStock->increment('reserved_quantity', $quantity);

        // Log the stock movement
        StockMovement::create([
            'product_id' => $productId,
            'warehouse_id' => $defaultWarehouse->id,
            'type' => 'RESERVATION',
            'quantity_change' => -$quantity,
            'reference_id' => $this->id,
            'reference_type' => Quotation::class,
            'notes' => "Stock reserved for Sales Order conversion from Quotation #{$this->quotation_number}",
        ]);
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
        $defaultWarehouse = Warehouse::first() ?? Warehouse::create(['name' => 'Default Warehouse', 'location' => 'Default Location']);

        foreach ($this->quotationItems as $item) {
            $productStock = ProductStock::where('product_id', $item->product_id)
                ->where('warehouse_id', $defaultWarehouse->id)
                ->first();

            if (!$productStock || ($productStock->quantity - $productStock->reserved_quantity) < $item->quantity) {
                return false;
            }
        }

        return true;
    }
}
