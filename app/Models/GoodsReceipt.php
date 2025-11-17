<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GoodsReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'gr_number',
        'purchase_order_id',
        'warehouse_id',
        'received_by',
        'status',
        'received_date',
        'notes',
        'total_amount',
    ];

    protected $casts = [
        'received_date' => 'date',
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
            'RECEIVED' => '<span class="badge bg-success">Received</span>',
            'REJECTED' => '<span class="badge bg-danger">Rejected</span>',
        ];

        return $badges[$this->status] ?? '<span class="badge bg-secondary">' . $this->status . '</span>';
    }

    public function scopeFilter($query, array $filters)
    {
        $query->when($filters['search'] ?? null, function ($query, $search) {
            $query->where('gr_number', 'like', "%{$search}%")
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

    public function processReceipt()
    {
        \DB::transaction(function () {
            foreach ($this->items as $item) {
                if ($item->condition === 'GOOD') {
                    // Update product stock
                    $productStock = \App\Models\ProductStock::firstOrCreate(
                        [
                            'product_id' => $item->product_id,
                            'warehouse_id' => $this->warehouse_id,
                        ],
                        ['quantity' => 0]
                    );

                    $productStock->quantity += $item->quantity_received;
                    $productStock->save();

                    // Update PO item received quantity
                    $poItem = \App\Models\PurchaseOrderItem::find($item->purchase_order_item_id);
                    if ($poItem) {
                        $poItem->addReceivedQuantity($item->quantity_received);
                    }

                    // Create stock movement
                    \App\Models\StockMovement::create([
                        'product_id' => $item->product_id,
                        'warehouse_id_from' => null,
                        'warehouse_id_to' => $this->warehouse_id,
                        'quantity' => $item->quantity_received,
                        'type' => 'IN',
                        'reference_type' => 'GoodsReceipt',
                        'reference_id' => $this->id,
                        'notes' => "Goods Receipt {$this->gr_number}",
                    ]);
                }
            }

            // Update PO status
            $this->purchaseOrder->updateStatusBasedOnReceivedItems();

            // Update GR status
            $this->status = 'RECEIVED';
            $this->received_date = now();
            $this->save();
        });
    }
}
