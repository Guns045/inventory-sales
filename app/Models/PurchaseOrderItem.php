<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PurchaseOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'product_id',
        'quantity_ordered',
        'quantity_received',
        'unit_price',
        'warehouse_id',
    ];

    protected $casts = [
        'quantity_ordered' => 'integer',
        'quantity_received' => 'integer',
        'unit_price' => 'decimal:2',
    ];

    protected $with = ['product'];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function goodsReceiptItems()
    {
        return $this->hasMany(GoodsReceiptItem::class);
    }

    public function getRemainingQuantityAttribute()
    {
        return $this->quantity_ordered - $this->quantity_ordered_received;
    }

    public function getIsFullyReceivedAttribute()
    {
        return $this->quantity_ordered_received >= $this->quantity_ordered;
    }

    public function getIsPartiallyReceivedAttribute()
    {
        return $this->quantity_ordered_received > 0 && $this->quantity_ordered_received < $this->quantity_ordered;
    }

    public function getFormattedUnitPriceAttribute()
    {
        return 'IDR ' . number_format($this->unit_price, 0, ',', '.');
    }

    public function addReceivedQuantity($quantity)
    {
        $this->quantity_received += $quantity;
        if ($this->quantity_received > $this->quantity_ordered) {
            $this->quantity_received = $this->quantity_ordered;
        }
        return $this->save();
    }
}
