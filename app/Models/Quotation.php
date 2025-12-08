<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use App\Traits\DocumentNumberHelper;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\ProductStock;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Quotation extends Model
{
    use DocumentNumberHelper, HasFactory;
    protected $fillable = [
        'quotation_number',
        'customer_id',
        'user_id',
        'warehouse_id', // Tambah warehouse_id
        'status',
        'valid_until',
        'subtotal',
        'discount',
        'tax',
        'total_amount',
        'tax_rate', // Tambah field tax
        'other_costs', // Tambah field other costs
        'payment_term', // Tambah field payment term
        'terms', // Tambah field terms
        'notes', // Tambah field notes
        'po_number',
    ];

    protected $casts = [
        'valid_until' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function quotationItems()
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function salesOrder()
    {
        return $this->hasOne(SalesOrder::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function approvals(): MorphMany
    {
        return $this->morphMany(Approval::class, 'approvable');
    }

    /**
     * Get the latest approval for this quotation
     */
    public function latestApproval()
    {
        return $this->approvals()->latest()->first();
    }

    /**
     * Check if quotation has pending approval
     */
    public function hasPendingApproval(): bool
    {
        return $this->approvals()->where('status', 'PENDING')->exists();
    }

    /**
     * Check if quotation is approved
     */
    public function isApproved(): bool
    {
        // Simplified: check if quotation status is APPROVED
        return $this->status === 'APPROVED';
    }

    /**
     * Submit quotation for approval
     */
    public function submitForApproval($notes = null): Approval
    {
        $this->update(['status' => 'SUBMITTED']);

        // Check if multi-level approval is needed
        // $approvalLevels = $this->getRequiredApprovalLevels();

        // TEMPORARY: Disable multi-level approval as per user request
        // if ($approvalLevels->count() > 1) {
        //     // Multi-level approval
        //     return Approval::createMultiLevelRequest($this, $approvalLevels, $notes);
        // } else {
        // Single-level approval (legacy)
        return Approval::createRequest($this, $notes);
        // }
    }

    /**
     * Get required approval levels based on quotation amount
     */
    public function getRequiredApprovalLevels()
    {
        $rules = ApprovalRule::findApplicableRules('Quotation', $this->total_amount);

        if ($rules->isNotEmpty()) {
            // Use the first matching rule (most specific)
            $rule = $rules->first();
            return $rule->getOrderedApprovalLevels();
        }

        // Fallback to default approval levels based on amount
        return ApprovalLevel::active()
            ->where('min_amount', '<=', $this->total_amount)
            ->where(function ($query) {
                $query->whereNull('max_amount')
                    ->orWhere('max_amount', '>=', $this->total_amount);
            })
            ->ordered()
            ->get();
    }

    /**
     * Approve quotation at current level
     */
    public function approveCurrentLevel($approverNotes = null): bool
    {
        $approval = $this->getCurrentPendingApproval();
        if ($approval && $approval->isPending()) {
            return $approval->approveCurrentLevel($approverNotes);
        }
        return false;
    }

    /**
     * Reject quotation at current level
     */
    public function rejectCurrentLevel($approverNotes = null, $reasonType = null): bool
    {
        $approval = $this->getCurrentPendingApproval();
        if ($approval && $approval->isPending()) {
            return $approval->rejectCurrentLevel($approverNotes, $reasonType);
        }
        return false;
    }

    /**
     * Get current pending approval
     */
    public function getCurrentPendingApproval()
    {
        return Approval::getCurrentPending($this);
    }

    /**
     * Check if quotation requires multi-level approval
     */
    public function requiresMultiLevelApproval(): bool
    {
        $approvalLevels = $this->getRequiredApprovalLevels();
        return $approvalLevels->count() > 1;
    }

    /**
     * Get approval workflow status
     */
    public function getApprovalWorkflowStatus()
    {
        $currentApproval = $this->getCurrentPendingApproval();

        if (!$currentApproval) {
            $latestApproval = $this->latestApproval();
            return $latestApproval ? $latestApproval->workflow_status : null;
        }

        return $currentApproval->workflow_status;
    }

    /**
     * Get all approvals in workflow
     */
    public function getWorkflowApprovals()
    {
        return $this->approvals()->orderBy('level_order')->get();
    }

    /**
     * Check if quotation can be approved by current user
     */
    public function canBeApprovedBy($user): bool
    {
        // Only Super Admin and Admin can approve
        $userRole = $user->role ? $user->role->name : '';
        return in_array($userRole, ['Super Admin', 'Admin']) && $this->status === 'SUBMITTED';
    }

    /**
     * Legacy methods for backward compatibility
     */
    public function approve($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            return $approval->approveCurrentLevel($approverNotes);
        }
        return false;
    }

    public function reject($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            return $approval->rejectCurrentLevel($approverNotes);
        }
        return false;
    }

    /**
     * Check if quotation can be converted to Sales Order
     * Note: Detailed stock check logic moved to InventoryService
     */
    public function canBeConverted(): bool
    {
        return $this->isApproved() && !$this->salesOrder;
    }
}
