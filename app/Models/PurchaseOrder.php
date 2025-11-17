<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'po_number',
        'supplier_id',
        'warehouse_id',
        'user_id',
        'status',
        'order_date',
        'expected_delivery_date',
        'total_amount',
        'notes',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'total_amount' => 'decimal:2',
    ];

    protected $with = ['supplier', 'warehouse', 'user', 'items'];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function goodsReceipts()
    {
        return $this->hasMany(GoodsReceipt::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'reference_id')
            ->where('reference_type', 'PurchaseOrder');
    }

    public function getFormattedTotalAttribute()
    {
        return 'IDR ' . number_format($this->total_amount, 0, ',', '.');
    }

    public function getIsCompletedAttribute()
    {
        return $this->status === 'COMPLETED';
    }

    public function getIsPartiallyReceivedAttribute()
    {
        return $this->status === 'PARTIAL_RECEIVED';
    }

    public function scopeFilter($query, array $filters)
    {
        $query->when($filters['search'] ?? null, function ($query, $search) {
            $query->where('po_number', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($q) use ($search) {
                      $q->where('company_name', 'like', "%{$search}%");
                  });
        });

        $query->when($filters['status'] ?? null, function ($query, $status) {
            $query->where('status', $status);
        });

        $query->when($filters['supplier_id'] ?? null, function ($query, $supplierId) {
            $query->where('supplier_id', $supplierId);
        });

        $query->when($filters['warehouse_id'] ?? null, function ($query, $warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        });

        $query->when($filters['date_from'] ?? null, function ($query, $dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        });

        $query->when($filters['date_to'] ?? null, function ($query, $dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        });
    }

    public function scopeForWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_id', $warehouseId);
    }

    public function canBeReceived()
    {
        return in_array($this->status, ['CONFIRMED', 'PARTIAL_RECEIVED']);
    }

    public function updateStatusBasedOnReceivedItems()
    {
        $totalOrdered = $this->items()->sum('quantity');
        $totalReceived = $this->items()->sum('quantity_received');

        if ($totalReceived >= $totalOrdered) {
            $this->status = 'COMPLETED';
        } elseif ($totalReceived > 0) {
            $this->status = 'PARTIAL_RECEIVED';
        }

        $this->save();
    }
}
