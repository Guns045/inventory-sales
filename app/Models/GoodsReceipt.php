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
                        ['quantity' => 0, 'reserved_quantity' => 0]
                    );

                    $productStock->quantity += $item->quantity_received;
                    $productStock->save();

                    // Update PO item received quantity
                    $poItem = \App\Models\PurchaseOrderItem::find($item->purchase_order_item_id);
                    if ($poItem) {
                        $poItem->quantity_received += $item->quantity_received;
                        $poItem->save();
                    }

                    // Create stock movement
                    \App\Models\StockMovement::create([
                        'product_id' => $item->product_id,
                        'warehouse_id' => $this->warehouse_id,
                        'quantity_change' => $item->quantity_received,
                        'type' => 'IN',
                        'reference_type' => 'GoodsReceipt',
                        'reference_id' => $this->id,
                    ]);
                }
            }

            // Update GR status based on completion
            $this->updateGoodsReceiptStatus();

            // Update PO status based on completion
            $this->updatePurchaseOrderStatus();
        });
    }

    private function updateGoodsReceiptStatus()
    {
        $totalItems = $this->items->count();
        $completedItems = 0;
        $partialItems = 0;

        foreach ($this->items as $item) {
            if ($item->quantity_received >= $item->quantity_ordered) {
                $completedItems++;
            } elseif ($item->quantity_received > 0) {
                $partialItems++;
            }
        }

        if ($completedItems === $totalItems) {
            // All items fully received
            $this->status = 'RECEIVED';
        } elseif ($completedItems > 0 || $partialItems > 0) {
            // Some items received but not all
            $this->status = 'PARTIAL_RECEIVED';
        }
        // Keep PENDING if no items received

        $this->save();
    }

    private function updatePurchaseOrderStatus()
    {
        $po = $this->purchaseOrder;
        $totalItems = $po->items->count();
        $completedItems = 0;
        $partialItems = 0;

        foreach ($po->items as $poItem) {
            $totalReceived = $this->items()
                ->where('purchase_order_item_id', $poItem->id)
                ->sum('quantity_received');

            if ($totalReceived >= $poItem->quantity_ordered) {
                $completedItems++;
            } elseif ($totalReceived > 0) {
                $partialItems++;
            }
        }

        if ($completedItems === $totalItems) {
            // All items fully received
            $po->status = 'RECEIVED';
        } elseif ($completedItems > 0 || $partialItems > 0) {
            // Some items received but not all
            $po->status = 'PARTIAL_RECEIVED';
        }

        $po->save();
    }
}
