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
<<<<<<< HEAD
        'reason',
=======
        'reference_number',
        'created_by',
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
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
