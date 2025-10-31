<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickingList extends Model
{
    protected $fillable = [
        'picking_list_number',
        'sales_order_id',
        'user_id',
        'status',
        'notes',
        'picked_at',
        'completed_at',
    ];

    protected $casts = [
        'picked_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public static function generateNumber(): string
    {
        $prefix = 'PL';
        $date = now()->format('Y-m-d');
        $lastNumber = static::whereDate('created_at', now())
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastNumber ? (int) substr($lastNumber->picking_list_number, -3) + 1 : 1;

        return "{$prefix}-{$date}-" . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PickingListItem::class);
    }

    public function deliveryOrders(): HasMany
    {
        return $this->hasMany(DeliveryOrder::class);
    }

    public function getFormattedNumberAttribute(): string
    {
        return $this->picking_list_number;
    }

    public function getHasDeliveryOrderAttribute(): bool
    {
        return $this->deliveryOrders()->exists();
    }

    public function getLatestDeliveryOrderAttribute(): ?DeliveryOrder
    {
        return $this->deliveryOrders()->latest()->first();
    }

    public function canGenerateDeliveryOrder(): bool
    {
        return $this->status === 'COMPLETED' && !$this->hasDeliveryOrder;
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'DRAFT' => 'Draft',
            'READY' => 'Ready to Pick',
            'PICKING' => 'Picking in Progress',
            'COMPLETED' => 'Completed',
            'CANCELLED' => 'Cancelled',
            default => $this->status,
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'DRAFT' => 'gray',
            'READY' => 'blue',
            'PICKING' => 'yellow',
            'COMPLETED' => 'green',
            'CANCELLED' => 'red',
            default => 'gray',
        };
    }
}
