<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number',
        'customer_id',
        'user_id',
        'status',
        'valid_until',
        'subtotal',
        'discount',
        'tax',
        'total_amount',
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
        return $this->approvals()->where('status', 'APPROVED')->exists();
    }

    /**
     * Submit quotation for approval
     */
    public function submitForApproval($notes = null): Approval
    {
        $this->update(['status' => 'SUBMITTED']);
        return Approval::createRequest($this, $notes);
    }

    /**
     * Approve quotation
     */
    public function approve($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            $approval->approve($approverNotes);
            $this->update(['status' => 'APPROVED']);
            return true;
        }
        return false;
    }

    /**
     * Reject quotation
     */
    public function reject($approverNotes = null): bool
    {
        $approval = $this->latestApproval();
        if ($approval && $approval->isPending()) {
            $approval->reject($approverNotes);
            $this->update(['status' => 'REJECTED']);
            return true;
        }
        return false;
    }
}
