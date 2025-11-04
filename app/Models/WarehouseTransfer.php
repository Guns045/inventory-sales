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

        // Auto-generate transfer number when creating
        static::creating(function ($transfer) {
            if (empty($transfer->transfer_number)) {
                $transfer->transfer_number = self::generateTransferNumber();
            }
        });
    }

    public static function generateTransferNumber()
    {
        $prefix = 'IT-' . date('Y-m-d') . '-';
        $lastTransfer = self::where('transfer_number', 'like', $prefix . '%')
            ->orderBy('transfer_number', 'desc')
            ->first();

        $sequence = $lastTransfer ? intval(substr($lastTransfer->transfer_number, -3)) + 1 : 1;

        return $prefix . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }

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

    // Status methods
    public function isRequested(): bool
    {
        return $this->status === 'REQUESTED';
    }

    public function isApproved(): bool
    {
        return $this->status === 'APPROVED';
    }

    public function isInTransit(): bool
    {
        return $this->status === 'IN_TRANSIT';
    }

    public function isReceived(): bool
    {
        return $this->status === 'RECEIVED';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'CANCELLED';
    }

    public function canBeApproved(): bool
    {
        return $this->isRequested();
    }

    public function canBeDelivered(): bool
    {
        return $this->isApproved();
    }

    public function canBeReceived(): bool
    {
        return $this->isInTransit();
    }

    public function canBeCancelled(): bool
    {
        return $this->isRequested() || $this->isApproved();
    }

    // Stock availability check
    public function hasSufficientStock(): bool
    {
        $stock = ProductStock::where('product_id', $this->product_id)
            ->where('warehouse_id', $this->warehouse_from_id)
            ->first();

        return $stock && $stock->quantity >= $this->quantity_requested;
    }

    public function getAvailableStock(): int
    {
        $stock = ProductStock::where('product_id', $this->product_id)
            ->where('warehouse_id', $this->warehouse_from_id)
            ->first();

        return $stock ? $stock->quantity : 0;
    }

    // Scopes
    public function scopeForUser($query, $user)
    {
        // If no user provided, return all transfers
        if (!$user) {
            return $query;
        }

        // If user is warehouse manager, only show transfers for their warehouse
        if ($user->role === 'Gudang' && $user->warehouse_id) {
            return $query->where(function ($q) use ($user) {
                $q->where('warehouse_from_id', $user->warehouse_id)
                  ->orWhere('warehouse_to_id', $user->warehouse_id);
            });
        }

        // Admin and other roles can see all transfers
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
}