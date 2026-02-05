<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryOrderItem extends Model
{
    protected $fillable = [
        'delivery_order_id',
        'sales_order_item_id', // Added for consolidated DO
        'product_id',
        'quantity_shipped',
        'quantity_delivered',
        'status',
        'notes',
        'location_code',
        'delivered_at',
    ];

    protected $casts = [
        'delivered_at' => 'datetime',
        'quantity_shipped' => 'integer',
        'quantity_delivered' => 'integer',
    ];

    public function deliveryOrder(): BelongsTo
    {
        return $this->belongsTo(DeliveryOrder::class);
    }

    public function salesOrderItem(): BelongsTo
    {
        return $this->belongsTo(SalesOrderItem::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'PREPARING' => 'Preparing',
            'READY' => 'Ready',
            'IN_TRANSIT' => 'In Transit',
            'DELIVERED' => 'Delivered',
            'PARTIAL' => 'Partial',
            'DAMAGED' => 'Damaged',
            default => $this->status,
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'PREPARING' => 'blue',
            'READY' => 'green',
            'IN_TRANSIT' => 'yellow',
            'DELIVERED' => 'success',
            'PARTIAL' => 'warning',
            'DAMAGED' => 'danger',
            default => 'gray',
        };
    }

    public function getIsDeliveredAttribute(): bool
    {
        return $this->status === 'DELIVERED';
    }

    public function getIsPartiallyDeliveredAttribute(): bool
    {
        return $this->status === 'PARTIAL';
    }

    public function getRemainingQuantityAttribute(): int
    {
        return max(0, $this->quantity_shipped - $this->quantity_delivered);
    }

    public function getDeliveryPercentageAttribute(): float
    {
        if ($this->quantity_shipped == 0)
            return 0;
        return ($this->quantity_delivered / $this->quantity_shipped) * 100;
    }

    public function markAsDelivered(?int $quantity = null): void
    {
        $quantityToDeliver = $quantity ?? $this->remaining_quantity;

        if ($quantityToDeliver <= 0)
            return;

        $newDelivered = $this->quantity_delivered + $quantityToDeliver;

        $this->update([
            'quantity_delivered' => $newDelivered,
            'status' => $newDelivered >= $this->quantity_shipped ? 'DELIVERED' :
                ($newDelivered > 0 ? 'PARTIAL' : $this->status),
            'delivered_at' => $newDelivered >= $this->quantity_shipped ? now() : $this->delivered_at,
        ]);
    }

    public function markAsDamaged(): void
    {
        $this->update(['status' => 'DAMAGED']);
    }
}
