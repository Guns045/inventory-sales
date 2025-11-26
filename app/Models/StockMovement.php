<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = [
        'product_id',
        'warehouse_id',
        'type',
        'quantity', // Legacy support or alias?
        'quantity_change',
        'previous_quantity',
        'new_quantity',
        'movement_date',
        'reference_type',
        'reference_id',
        'reference_number',
        'created_by',
        'notes',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
