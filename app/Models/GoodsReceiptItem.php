<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GoodsReceiptItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'goods_receipt_id',
        'purchase_order_item_id',
        'product_id',
        'quantity_ordered',
        'quantity_received',
        'unit_price',
        'line_total',
        'condition',
        'batch_number',
        'expiry_date',
        'notes',
    ];

    protected $casts = [
        'quantity_ordered' => 'integer',
        'quantity_received' => 'integer',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    protected $with = ['product'];

    public function goodsReceipt()
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    public function purchaseOrderItem()
    {
        return $this->belongsTo(PurchaseOrderItem::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function getFormattedUnitPriceAttribute()
    {
        return 'IDR ' . number_format($this->unit_price, 0, ',', '.');
    }

    public function getFormattedLineTotalAttribute()
    {
        return 'IDR ' . number_format($this->line_total, 0, ',', '.');
    }

    public function getConditionBadgeAttribute()
    {
        $badges = [
            'GOOD' => '<span class="badge bg-success">Good</span>',
            'DAMAGED' => '<span class="badge bg-warning">Damaged</span>',
            'DEFECTIVE' => '<span class="badge bg-danger">Defective</span>',
            'WRONG_ITEM' => '<span class="badge bg-info">Wrong Item</span>',
        ];

        return $badges[$this->condition] ?? '<span class="badge bg-secondary">' . $this->condition . '</span>';
    }

    public function isValidQuantity()
    {
        return $this->quantity_received <= $this->quantity_ordered;
    }

    public function canBeAddedToStock()
    {
        return $this->condition === 'GOOD' && $this->isValidQuantity();
    }
}
