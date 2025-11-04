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
        'approval_level_id',
        'level_order',
        'approval_chain',
        'next_approver_id',
        'status',
        'workflow_status',
        'notes',
        'approved_at',
        'final_approval_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'approval_chain' => 'array',
        'approved_at' => 'datetime',
        'final_approval_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function nextApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'next_approver_id');
    }

    public function approvalLevel(): BelongsTo
    {
        return $this->belongsTo(ApprovalLevel::class);
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

    /**
     * Check if workflow is completed
     */
    public function isWorkflowCompleted(): bool
    {
        return $this->workflow_status === 'APPROVED' || $this->workflow_status === 'REJECTED';
    }

    /**
     * Check if this is the final approval level
     */
    public function isFinalLevel(): bool
    {
        if (!$this->approval_chain) {
            return true;
        }

        return $this->level_order >= count($this->approval_chain);
    }

    /**
     * Get next approval level
     */
    public function getNextLevel()
    {
        if ($this->isFinalLevel()) {
            return null;
        }

        $nextLevelOrder = $this->level_order + 1;
        $nextLevelId = $this->approval_chain[$nextLevelOrder - 1] ?? null;

        if ($nextLevelId) {
            return ApprovalLevel::find($nextLevelId);
        }

        return null;
    }

    /**
     * Create multi-level approval request
     */
    public static function createMultiLevelRequest($model, $approvalLevels, $notes = null): self
    {
        $approval = static::create([
            'user_id' => auth()->id(),
            'approvable_type' => get_class($model),
            'approvable_id' => $model->id,
            'approval_level_id' => $approvalLevels->first()->id,
            'level_order' => 1,
            'approval_chain' => $approvalLevels->pluck('id')->toArray(),
            'next_approver_id' => $approvalLevels->first()->getApprovers()->first()->id ?? null,
            'status' => 'PENDING',
            'workflow_status' => 'IN_PROGRESS',
            'notes' => $notes,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return $approval;
    }

    /**
     * Approve current level and move to next
     */
    public function approveCurrentLevel($notes = null): bool
    {
        $this->update([
            'status' => 'APPROVED',
            'approver_id' => auth()->id(),
            'notes' => $notes,
            'approved_at' => now(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        // If this is the final level, complete the workflow
        if ($this->isFinalLevel()) {
            return $this->completeWorkflow('APPROVED');
        }

        // Move to next level
        return $this->moveToNextLevel();
    }

    /**
     * Reject approval at current level
     */
    public function rejectCurrentLevel($notes = null): bool
    {
        $this->update([
            'status' => 'REJECTED',
            'approver_id' => auth()->id(),
            'notes' => $notes,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return $this->completeWorkflow('REJECTED');
    }

    /**
     * Move approval to next level
     */
    private function moveToNextLevel(): bool
    {
        $nextLevel = $this->getNextLevel();

        if (!$nextLevel) {
            return $this->completeWorkflow('APPROVED');
        }

        // Create next level approval
        $nextApproval = static::create([
            'user_id' => $this->user_id,
            'approvable_type' => $this->approvable_type,
            'approvable_id' => $this->approvable_id,
            'approval_level_id' => $nextLevel->id,
            'level_order' => $this->level_order + 1,
            'approval_chain' => $this->approval_chain,
            'next_approver_id' => $nextLevel->getApprovers()->first()->id ?? null,
            'status' => 'PENDING',
            'workflow_status' => 'IN_PROGRESS',
            'notes' => $this->notes,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return true;
    }

    /**
     * Complete the approval workflow
     */
    private function completeWorkflow($status): bool
    {
        $this->update([
            'workflow_status' => $status,
            'final_approval_at' => now(),
        ]);

        // Update the related document status
        $this->approvable->update(['status' => $status]);

        return true;
    }

    /**
     * Get all approvals in the same workflow
     */
    public function getWorkflowApprovals()
    {
        return static::where('approvable_type', $this->approvable_type)
                    ->where('approvable_id', $this->approvable_id)
                    ->orderBy('level_order')
                    ->get();
    }

    /**
     * Get current pending approval for a document
     */
    public static function getCurrentPending($model)
    {
        return static::where('approvable_type', get_class($model))
                    ->where('approvable_id', $model->id)
                    ->where('status', 'PENDING')
                    ->where('workflow_status', 'IN_PROGRESS')
                    ->orderBy('level_order')
                    ->first();
    }
}
