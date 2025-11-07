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

    protected static function boot()
    {
        parent::boot();

        // Auto-generate delivery order number when creating
        static::creating(function ($deliveryOrder) {
            if (empty($deliveryOrder->delivery_order_number)) {
                $deliveryOrder->delivery_order_number = $deliveryOrder->generateNumber();
            }
        });
    }

    public function generateNumber(): string
    {
        // Get warehouse code in this priority order:
        // 1. From picking list items (if picking list exists)
        // 2. From sales order items (if sales order exists)
        // 3. From created_by user's warehouse (if user has warehouse_id)
        // 4. Default to JKT warehouse
        $warehouseCode = 'WH';

        // Priority 1: Get from picking list items
        if ($this->pickingList && $this->pickingList->items && $this->pickingList->items->first()) {
            $warehouse = $this->pickingList->items->first()->warehouse;
            $warehouseCode = $warehouse ? $warehouse->code : 'WH';
        }
        // Priority 2: Get from sales order items
        elseif ($this->salesOrder && $this->salesOrder->items && $this->salesOrder->items->first()) {
            $warehouse = $this->salesOrder->items->first()->warehouse;
            $warehouseCode = $warehouse ? $warehouse->code : 'WH';
        }
        // Priority 3: Get from created_by user's warehouse assignment
        elseif ($this->created_by) {
            $user = \App\Models\User::find($this->created_by);
            if ($user && $user->warehouse_id) {
                $warehouse = \App\Models\Warehouse::find($user->warehouse_id);
                $warehouseCode = $warehouse ? $warehouse->code : 'WH';
            }
        }
        // Priority 4: Default to JKT warehouse
        else {
            $jktWarehouse = \App\Models\Warehouse::where('code', 'JKT')->first();
            $warehouseCode = $jktWarehouse ? $jktWarehouse->code : 'WH';
        }

        $prefix = 'DO-';
        $monthYear = now()->format('m-Y');
        $pattern = $prefix . '%/' . $warehouseCode . '/' . $monthYear;

        $lastNumber = static::where('delivery_order_number', 'like', $pattern)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastNumber) {
            // Extract sequence from format: DO-XXXX/JKT/11-2025
            $parts = explode('/', $lastNumber->delivery_order_number);
            $lastSequence = intval(substr($parts[0], 3)); // Get XXXX from DO-XXXX
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
