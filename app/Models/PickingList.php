<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\DocumentNumberHelper;

class PickingList extends Model
{
    use DocumentNumberHelper;
    protected $fillable = [
        'picking_list_number',
        'sales_order_id',
        'user_id',
        'warehouse_id',
        'status',
        'notes',
        'picked_at',
        'completed_at',
    ];

    protected $casts = [
        'picked_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        // Auto-generate picking list number when creating
        static::creating(function ($pickingList) {
            if (empty($pickingList->picking_list_number)) {
                $pickingList->picking_list_number = $pickingList->generatePickingListNumber($pickingList->warehouse_id);
            }
        });
    }

    
    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
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
