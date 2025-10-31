<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickingListItem extends Model
{
    protected $fillable = [
        'picking_list_id',
        'product_id',
        'warehouse_id',
        'location_code',
        'quantity_required',
        'quantity_picked',
        'status',
        'notes',
    ];

    public function pickingList(): BelongsTo
    {
        return $this->belongsTo(PickingList::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'PENDING' => 'Pending',
            'PARTIAL' => 'Partial',
            'COMPLETED' => 'Completed',
            default => $this->status,
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'PENDING' => 'gray',
            'PARTIAL' => 'yellow',
            'COMPLETED' => 'green',
            default => 'gray',
        };
    }

    public function getIsCompletedAttribute(): bool
    {
        return $this->quantity_picked >= $this->quantity_required;
    }

    public function getRemainingQuantityAttribute(): int
    {
        return max(0, $this->quantity_required - $this->quantity_picked);
    }

    public function getCompletionPercentageAttribute(): float
    {
        if ($this->quantity_required == 0) return 0;
        return ($this->quantity_picked / $this->quantity_required) * 100;
    }
}
