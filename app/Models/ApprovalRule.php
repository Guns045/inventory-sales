<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ApprovalRule extends Model
{
    protected $fillable = [
        'name',
        'description',
        'document_type',
        'min_amount',
        'max_amount',
        'approval_levels',
        'is_active',
    ];

    protected $casts = [
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'approval_levels' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the approval levels associated with this rule
     */
    public function approvalLevels(): BelongsToMany
    {
        return $this->belongsToMany(ApprovalLevel::class);
    }

    /**
     * Get approvals that use this rule
     */
    public function approvals()
    {
        return $this->hasMany(Approval::class);
    }

    /**
     * Check if this rule applies to the given document type and amount
     */
    public function appliesTo($documentType, $amount): bool
    {
        return $this->document_type === $documentType &&
               $amount >= $this->min_amount &&
               ($this->max_amount === null || $amount <= $this->max_amount) &&
               $this->is_active;
    }

    /**
     * Get the ordered approval levels for this rule
     */
    public function getOrderedApprovalLevels()
    {
        if (empty($this->approval_levels)) {
            return collect();
        }

        return ApprovalLevel::whereIn('id', $this->approval_levels)
            ->active()
            ->ordered()
            ->get();
    }

    /**
     * Scope to get active rules
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get rules for a specific document type
     */
    public function scopeForDocument($query, $documentType)
    {
        return $query->where('document_type', $documentType);
    }

    /**
     * Find applicable rules for a document type and amount
     */
    public static function findApplicableRules($documentType, $amount)
    {
        return static::active()
            ->forDocument($documentType)
            ->where('min_amount', '<=', $amount)
            ->where(function ($query) use ($amount) {
                $query->whereNull('max_amount')
                      ->orWhere('max_amount', '>=', $amount);
            })
            ->orderBy('min_amount', 'desc')
            ->get();
    }
}