<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GoodsReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'receipt_number',  // Changed from gr_number to match database
        'purchase_order_id',
        'warehouse_id',
        'user_id',
        'received_by',
        'status',
        'receipt_date',
        'notes',
        'total_amount',
    ];

    protected $casts = [
        'receipt_date' => 'date',
        'total_amount' => 'decimal:2',
    ];

    protected $with = ['purchaseOrder', 'warehouse', 'receivedBy', 'items'];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function items()
    {
        return $this->hasMany(GoodsReceiptItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'reference_id')
            ->where('reference_type', 'GoodsReceipt');
    }

    public function getFormattedTotalAttribute()
    {
        return 'IDR ' . number_format($this->total_amount, 0, ',', '.');
    }

    public function getStatusBadgeAttribute()
    {
        $badges = [
            'PENDING' => '<span class="badge bg-warning">Pending</span>',
            'PARTIAL_RECEIVED' => '<span class="badge bg-info">Partial Received</span>',
            'RECEIVED' => '<span class="badge bg-success">Received</span>',
            'COMPLETED' => '<span class="badge bg-success">Completed</span>',
            'REJECTED' => '<span class="badge bg-danger">Rejected</span>',
            'CANCELLED' => '<span class="badge bg-danger">Cancelled</span>',
        ];

        return $badges[$this->status] ?? '<span class="badge bg-secondary">' . $this->status . '</span>';
    }

    public function scopeFilter($query, array $filters)
    {
        $query->when($filters['search'] ?? null, function ($query, $search) {
            $query->where('receipt_number', 'like', "%{$search}%")
                ->orWhereHas('purchaseOrder', function ($q) use ($search) {
                    $q->where('po_number', 'like', "%{$search}%");
                });
        });

        $query->when($filters['status'] ?? null, function ($query, $status) {
            $query->where('status', $status);
        });

        $query->when($filters['warehouse_id'] ?? null, function ($query, $warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        });

        $query->when($filters['date_from'] ?? null, function ($query, $dateFrom) {
            $query->whereDate('received_date', '>=', $dateFrom);
        });

        $query->when($filters['date_to'] ?? null, function ($query, $dateTo) {
            $query->whereDate('received_date', '<=', $dateTo);
        });
    }

    public function scopeForWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_id', $warehouseId);
    }

    public function isCompleted()
    {
        return $this->status === 'RECEIVED';
    }


}
