<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalLevel extends Model
{
    protected $fillable = [
        'name',
        'description',
        'level_order',
        'role_id',
        'min_amount',
        'max_amount',
        'is_active',
    ];

    protected $casts = [
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(Approval::class);
    }

    /**
     * Get approval rules that use this level
     */
    public function approvalRules(): BelongsToMany
    {
        return $this->belongsToMany(ApprovalRule::class);
    }

    /**
     * Check if amount falls within this approval level range
     */
    public function appliesToAmount($amount): bool
    {
        return $amount >= $this->min_amount &&
               ($this->max_amount === null || $amount <= $this->max_amount);
    }

    /**
     * Get users who can approve at this level
     */
    public function getApprovers()
    {
        if ($this->role_id) {
            return User::where('role_id', $this->role_id)->get();
        }

        return collect();
    }

    /**
     * Scope to get active approval levels
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by level order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('level_order');
    }
}