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

    protected static function boot()
    {
        parent::boot();

        // Auto-generate picking list number when creating
        static::creating(function ($pickingList) {
            if (empty($pickingList->picking_list_number)) {
                $pickingList->picking_list_number = $pickingList->generateNumber();
            }
        });
    }

    public function generateNumber()
    {
        // Get warehouse code in this priority order:
        // 1. From picking list items (if items exist)
        // 2. From user's assigned warehouse (if user has warehouse_id)
        // 3. From related sales order warehouse (if exists)
        // 4. Default to JKT or first available warehouse
        $warehouseCode = 'WH';

        // Priority 1: Get from picking list items
        if ($this->items && $this->items->first()) {
            $warehouse = $this->items->first()->warehouse;
            $warehouseCode = $warehouse ? $warehouse->code : 'WH';
        }
        // Priority 2: Get from user's warehouse assignment
        elseif ($this->user && $this->user->warehouse_id) {
            $warehouse = \App\Models\Warehouse::find($this->user->warehouse_id);
            $warehouseCode = $warehouse ? $warehouse->code : 'WH';
        }
        // Priority 3: Get from related sales order items
        elseif ($this->salesOrder && $this->salesOrder->items && $this->salesOrder->items->first()) {
            $warehouse = $this->salesOrder->items->first()->warehouse;
            $warehouseCode = $warehouse ? $warehouse->code : 'WH';
        }
        // Priority 4: Default to JKT warehouse (most common)
        else {
            $jktWarehouse = \App\Models\Warehouse::where('code', 'JKT')->first();
            $warehouseCode = $jktWarehouse ? $jktWarehouse->code : 'WH';
        }

        $prefix = 'PL-';
        $monthYear = date('m-Y');
        $pattern = $prefix . '%/' . $warehouseCode . '/' . $monthYear;

        $lastNumber = self::where('picking_list_number', 'like', $pattern)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastNumber) {
            // Extract sequence from format: PL-XXXX/JKT/11-2025
            $parts = explode('/', $lastNumber->picking_list_number);
            $lastSequence = intval(substr($parts[0], 3)); // Get XXXX from PL-XXXX
            $sequence = $lastSequence + 1;
        } else {
            $sequence = 1;
        }

        return $prefix . str_pad($sequence, 4, '0', STR_PAD_LEFT) . '/' . $warehouseCode . '/' . $monthYear;
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
