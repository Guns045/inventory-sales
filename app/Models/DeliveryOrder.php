<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryOrder extends Model
{
    protected $fillable = [
        'delivery_order_number',
        'sales_order_id',
        'picking_list_id',
        'customer_id',
        'shipping_date',
        'shipping_contact_person',
        'shipping_address',
        'shipping_city',
        'driver_name',
        'vehicle_plate_number',
        'status',
        'notes',
        'delivered_at',
        'created_by',
    ];

    protected $casts = [
        'shipping_date' => 'date',
        'delivered_at' => 'datetime',
        'created_by' => 'integer',
    ];

    public static function generateNumber(): string
    {
        $prefix = 'DO';
        $date = now()->format('Y-m-d');
        $lastNumber = static::whereDate('created_at', now())
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastNumber ? (int) substr($lastNumber->delivery_order_number, -3) + 1 : 1;

        return "{$prefix}-{$date}-" . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function pickingList(): BelongsTo
    {
        return $this->belongsTo(PickingList::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deliveryOrderItems(): HasMany
    {
        return $this->hasMany(DeliveryOrderItem::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'PREPARING' => 'Preparing',
            'READY' => 'Ready to Ship',
            'SHIPPED' => 'Shipped',
            'DELIVERED' => 'Delivered',
            'CANCELLED' => 'Cancelled',
            default => $this->status,
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'PREPARING' => 'blue',
            'READY' => 'green',
            'SHIPPED' => 'yellow',
            'DELIVERED' => 'success',
            'CANCELLED' => 'red',
            default => 'gray',
        };
    }

    public function getFormattedNumberAttribute(): string
    {
        return $this->delivery_order_number;
    }

    public function getIsDeliveredAttribute(): bool
    {
        return $this->status === 'DELIVERED';
    }

    public function getIsReadyToShipAttribute(): bool
    {
        return in_array($this->status, ['READY', 'SHIPPED']);
    }

    public function canBeDelivered(): bool
    {
        return $this->status === 'SHIPPED';
    }

    public function markAsDelivered(): void
    {
        if ($this->canBeDelivered()) {
            $this->update([
                'status' => 'DELIVERED',
                'delivered_at' => now(),
            ]);

            // Update Sales Order status
            if ($this->salesOrder) {
                $this->salesOrder->update(['status' => 'COMPLETED']);
            }
        }
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['PREPARING', 'READY']);
    }

    public function cancel(): void
    {
        if ($this->canBeCancelled()) {
            $this->update(['status' => 'CANCELLED']);

            // Update related entities
            if ($this->salesOrder) {
                $this->salesOrder->update(['status' => 'READY_TO_SHIP']);
            }
        }
    }
}
