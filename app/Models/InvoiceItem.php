<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'sales_order_item_id', // Added for consolidated DO/Invoice support
        'product_id',
        'description',
        'quantity',
        'unit_price',
        'discount_percentage',
        'tax_rate',
        'total_price',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function salesOrderItem()
    {
        return $this->belongsTo(SalesOrderItem::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
