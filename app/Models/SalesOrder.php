<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesOrder extends Model
{
    protected $fillable = [
        'sales_order_number',
        'quotation_id',
        'customer_id',
        'user_id',
        'warehouse_id',
        'status',
        'total_amount',
        'notes',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function salesOrderItems()
    {
        return $this->hasMany(SalesOrderItem::class);
    }

    public function items()
    {
        return $this->salesOrderItems();
    }

    public function deliveryOrder()
    {
        return $this->hasOne(DeliveryOrder::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function pickingList()
    {
        return $this->hasOne(PickingList::class);
    }
}
