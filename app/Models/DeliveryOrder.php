<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryOrder extends Model
{
    protected $fillable = [
        'delivery_order_number',
        'sales_order_id',
        'customer_id',
        'shipping_date',
        'shipping_contact_person',
        'shipping_address',
        'shipping_city',
        'driver_name',
        'vehicle_plate_number',
        'status',
    ];

    protected $casts = [
        'shipping_date' => 'date',
    ];

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function deliveryOrderItems()
    {
        return $this->hasMany(DeliveryOrderItem::class);
    }
}
