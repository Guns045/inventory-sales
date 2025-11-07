<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'sku',
        'name',
        'description',
        'category_id',
        'supplier_id',
        'buy_price',
        'sell_price',
        'min_stock_level',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function productStock()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function quotationItems()
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function salesOrderItems()
    {
        return $this->hasMany(SalesOrderItem::class);
    }

    public function deliveryOrderItems()
    {
        return $this->hasMany(DeliveryOrderItem::class);
    }

    public function invoiceItems()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function purchaseOrderItems()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    // Accessor untuk current stock (total - reserved)
    public function getCurrentStockAttribute()
    {
        $totalQuantity = $this->productStock->sum('quantity');
        $totalReserved = $this->productStock->sum('reserved_quantity');
        return $totalQuantity - $totalReserved;
    }

    // Accessor untuk total stock
    public function getTotalStockAttribute()
    {
        return $this->productStock->sum('quantity');
    }

    // Accessor untuk reserved stock
    public function getReservedStockAttribute()
    {
        return $this->productStock->sum('reserved_quantity');
    }

    // Method untuk check if stock is low
    public function isStockLow()
    {
        return $this->current_stock <= $this->min_stock_level;
    }
}
