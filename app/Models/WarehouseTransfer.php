<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WarehouseTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'transfer_number',
        'product_id',
        'warehouse_from_id',
        'warehouse_to_id',
        'quantity_requested',
        'quantity_delivered',
        'quantity_received',
        'status',
        'notes',
        'reason',
        'requested_by',
        'approved_by',
        'approved_at',
        'delivered_by',
        'delivered_at',
        'received_by',
        'received_at',
        'requested_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'delivered_at' => 'datetime',
        'received_at' => 'datetime',
        'requested_at' => 'datetime',
        'quantity_requested' => 'integer',
        'quantity_delivered' => 'integer',
        'quantity_received' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();
    }


    // Scopes
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouseFrom(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_from_id');
    }

    public function warehouseTo(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_to_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function deliveredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivered_by');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
    public function scopeForUser($query, $user)
    {
        // If no user provided, return all transfers
        if (!$user) {
            return $query;
        }

        // Super Admin and specific admin roles can see all transfers related to their warehouse
        if (isset($user->role->name) && in_array($user->role->name, ['Super Admin', 'Admin Jakarta', 'Admin Makassar', 'Manager Jakarta', 'Manager Makassar'])) {
            // For warehouse-specific roles, filter by their assigned warehouse
            if ($user->role->name !== 'Super Admin' && $user->warehouse_id) {
                return $query->where(function ($q) use ($user) {
                    $q->where('warehouse_from_id', $user->warehouse_id)
                        ->orWhere('warehouse_to_id', $user->warehouse_id);
                });
            }
            // Super Admin can see all transfers
            return $query;
        }

        // If user has assigned warehouse, only show transfers for their warehouse
        if ($user->warehouse_id) {
            return $query->where(function ($q) use ($user) {
                $q->where('warehouse_from_id', $user->warehouse_id)
                    ->orWhere('warehouse_to_id', $user->warehouse_id);
            });
        }

        // Other roles can see all transfers if no warehouse assignment
        return $query;
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['REQUESTED', 'APPROVED']);
    }

    public function scopeFromWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_from_id', $warehouseId);
    }

    public function scopeToWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_to_id', $warehouseId);
    }

    public function scopeWithProduct($query)
    {
        return $query->with(['product', 'warehouseFrom', 'warehouseTo', 'requestedBy', 'approvedBy']);
    }

    // State Checks
    public function canBeApproved(): bool
    {
        return $this->status === 'REQUESTED';
    }

    public function canBeDelivered(): bool
    {
        return $this->status === 'APPROVED';
    }

    public function canBeReceived(): bool
    {
        return $this->status === 'IN_TRANSIT';
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['REQUESTED', 'APPROVED']);
    }
}