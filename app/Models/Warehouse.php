<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    protected $fillable = [
        'name',
        'location',
        'code',
        'is_active',
        'capacity',
        'manager_id',
    ];

    public function productStock()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function transfersFrom()
    {
        return $this->hasMany(WarehouseTransfer::class, 'warehouse_from_id');
    }

    public function transfersTo()
    {
        return $this->hasMany(WarehouseTransfer::class, 'warehouse_to_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Helper methods
    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function getTotalStockAttribute()
    {
        return $this->productStock()->sum('quantity');
    }

    public function getTotalReservedStockAttribute()
    {
        return $this->productStock()->sum('reserved_quantity');
    }

    public function getAvailableStockAttribute()
    {
        return $this->getTotalStockAttribute() - $this->getTotalReservedStockAttribute();
    }
}
