<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FinanceAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'currency',
        'balance',
        'account_number',
        'bank_name',
        'description',
        'is_active'
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function transactions()
    {
        return $this->hasMany(FinanceTransaction::class);
    }
}
