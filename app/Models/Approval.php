<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Approval extends Model
{
    protected $fillable = [
        'user_id',
        'approver_id',
        'approvable_type',
        'approvable_id',
        'status',
        'notes',
        'approved_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function approvable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Create approval request for a model
     */
    public static function createRequest($model, $notes = null): self
    {
        return static::create([
            'user_id' => auth()->id(),
            'approvable_type' => get_class($model),
            'approvable_id' => $model->id,
            'status' => 'PENDING',
            'notes' => $notes,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Approve the request
     */
    public function approve($notes = null): bool
    {
        return $this->update([
            'status' => 'APPROVED',
            'approver_id' => auth()->id(),
            'notes' => $notes,
            'approved_at' => now(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Reject the request
     */
    public function reject($notes = null): bool
    {
        return $this->update([
            'status' => 'REJECTED',
            'approver_id' => auth()->id(),
            'notes' => $notes,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Check if approved
     */
    public function isApproved(): bool
    {
        return $this->status === 'APPROVED';
    }

    /**
     * Check if rejected
     */
    public function isRejected(): bool
    {
        return $this->status === 'REJECTED';
    }

    /**
     * Check if pending
     */
    public function isPending(): bool
    {
        return $this->status === 'PENDING';
    }
}
