<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\DeliveryOrder;
use App\Models\GoodsReceipt;
use App\Models\PurchaseOrder;

class StockMovement extends Model
{
    protected $fillable = [
        'product_id',
        'warehouse_id',
        'type',
        'quantity',
        'quantity_change',
        'previous_quantity',
        'new_quantity',
        'movement_date',
        'reference_type',
        'reference_id',
        'reference_number',
        'created_by',
        'notes',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the reference model (DeliveryOrder, GoodsReceipt, etc.)
     */
    public function reference()
    {
        return $this->morphTo();
    }

    /**
     * Get the related party name (Customer or Supplier)
     */
    public function getRelatedPartyAttribute()
    {
        if (!$this->reference) {
            return '-';
        }

        $ref = $this->reference;

        // 1. Check for specific model types with custom logic
        if ($ref instanceof \App\Models\DeliveryOrder) {
            // Priority 1: Direct Customer
            if ($ref->customer?->name)
                return $ref->customer->name;
            // Priority 2: Customer from linked Sales Order
            if ($ref->salesOrder?->customer?->name)
                return $ref->salesOrder->customer->name;
            // Priority 3: Internal Transfer Info
            if ($ref->source_type === 'IT' && $ref->warehouseTransfer) {
                return "Transfer: {$ref->warehouseTransfer->transfer_number}";
            }
            return '-';
        }

        if ($ref instanceof \App\Models\GoodsReceipt) {
            // Priority 1: Supplier from PO
            if ($ref->purchaseOrder?->supplier?->name)
                return $ref->purchaseOrder->supplier->name;
            return '-';
        }

        if ($ref instanceof \App\Models\WarehouseTransfer) {
            return "Transfer: {$ref->transfer_number}";
        }

        if ($ref instanceof \App\Models\ProductStock) {
            return 'Stock Adjustment';
        }

        // 2. Generic check for common relationships across different models
        // Many models use 'customer' or 'supplier' relationships
        if (isset($ref->customer) && $ref->customer && isset($ref->customer->name)) {
            return $ref->customer->name;
        }

        if (isset($ref->supplier) && $ref->supplier && isset($ref->supplier->name)) {
            return $ref->supplier->name;
        }

        // 3. Check for specific item-level references
        if ($ref instanceof \App\Models\DeliveryOrderItem) {
            return $ref->deliveryOrder?->customer?->name ?? $ref->deliveryOrder?->salesOrder?->customer?->name ?? '-';
        }

        if ($ref instanceof \App\Models\SalesReturn) {
            return $ref->salesOrder?->customer?->name ?? '-';
        }

        if ($ref instanceof \App\Models\SalesOrderItem) {
            return $ref->salesOrder?->customer?->name ?? '-';
        }

        if ($ref instanceof \App\Models\Quotation) {
            return $ref->customer?->name ?? '-';
        }

        if ($ref instanceof \App\Models\QuotationItem) {
            return $ref->quotation?->customer?->name ?? '-';
        }

        return '-';
    }
}
