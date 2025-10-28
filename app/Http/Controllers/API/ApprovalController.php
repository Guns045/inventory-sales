<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Approval;
use App\Models\Quotation;
use App\Models\ActivityLog;
use App\Models\Notification;

class ApprovalController extends Controller
{
    /**
     * Get all pending approvals
     */
    public function index()
    {
        $approvals = Approval::with(['user', 'approver', 'approvable'])
            ->where('status', 'PENDING')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($approvals);
    }

    /**
     * Get approval by ID
     */
    public function show($id)
    {
        $approval = Approval::with(['user', 'approver', 'approvable'])->findOrFail($id);
        return response()->json($approval);
    }

    /**
     * Get approvals for specific type (quotations, sales orders, etc.)
     */
    public function getByType(Request $request, $type)
    {
        $query = Approval::with(['user', 'approver', 'approvable'])
            ->where('approvable_type', 'App\\Models\\' . ucfirst($type));

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $approvals = $query->orderBy('created_at', 'desc')->paginate(10);
        return response()->json($approvals);
    }

    /**
     * Approve a request
     */
    public function approve(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:500'
        ]);

        $approval = Approval::findOrFail($id);

        if ($approval->status !== 'PENDING') {
            return response()->json([
                'message' => 'This approval request is already processed'
            ], 422);
        }

        // Process approval
        $approval->approve($request->notes);

        // Update the related model status
        $approvable = $approval->approvable;
        if ($approvable && method_exists($approvable, 'updateStatus')) {
            $approvable->updateStatus('APPROVED');
        } elseif ($approvable instanceof Quotation) {
            $approvable->update(['status' => 'APPROVED']);
        }

        // Log activity
        ActivityLog::log(
            'APPROVE_REQUEST',
            "User approved {$approval->approvable_type} #{$approval->approvable_id}",
            $approval,
            ['status' => 'PENDING'],
            ['status' => 'APPROVED', 'approver_notes' => $request->notes]
        );

        // Send notification to the requester
        if ($approval->user_id) {
            Notification::createForUser(
                $approval->user_id,
                "Your approval request for {$approval->approvable_type} #{$approval->approvable_id} has been approved",
                'success',
                '/approvals'
            );
        }

        return response()->json([
            'message' => 'Request approved successfully',
            'approval' => $approval->load(['user', 'approver', 'approvable'])
        ]);
    }

    /**
     * Reject a request
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'notes' => 'required|string|max:500'
        ]);

        $approval = Approval::findOrFail($id);

        if ($approval->status !== 'PENDING') {
            return response()->json([
                'message' => 'This approval request is already processed'
            ], 422);
        }

        // Process rejection
        $approval->reject($request->notes);

        // Update the related model status
        $approvable = $approval->approvable;
        if ($approvable instanceof Quotation) {
            $approvable->update(['status' => 'REJECTED']);
        }

        // Log activity
        ActivityLog::log(
            'REJECT_REQUEST',
            "User rejected {$approval->approvable_type} #{$approval->approvable_id}",
            $approval,
            ['status' => 'PENDING'],
            ['status' => 'REJECTED', 'rejection_notes' => $request->notes]
        );

        // Send notification to the requester
        if ($approval->user_id) {
            Notification::createForUser(
                $approval->user_id,
                "Your approval request for {$approval->approvable_type} #{$approval->approvable_id} has been rejected. Reason: {$request->notes}",
                'warning',
                '/approvals'
            );
        }

        return response()->json([
            'message' => 'Request rejected successfully',
            'approval' => $approval->load(['user', 'approver', 'approvable'])
        ]);
    }

    /**
     * Submit quotation for approval
     */
    public function submitQuotation(Request $request, $quotationId)
    {
        $quotation = Quotation::findOrFail($quotationId);

        if ($quotation->status !== 'DRAFT') {
            return response()->json([
                'message' => 'Only draft quotations can be submitted for approval'
            ], 422);
        }

        if ($quotation->hasPendingApproval()) {
            return response()->json([
                'message' => 'This quotation already has a pending approval request'
            ], 422);
        }

        // Check if quotation has items
        if ($quotation->quotationItems->isEmpty()) {
            return response()->json([
                'message' => 'Quotation must have at least one item before submitting for approval'
            ], 422);
        }

        // Submit for approval
        $approval = $quotation->submitForApproval($request->notes);

        // Log activity
        ActivityLog::log(
            'SUBMIT_FOR_APPROVAL',
            "User submitted quotation {$quotation->quotation_number} for approval",
            $quotation
        );

        // Send notifications to managers/admins
        Notification::createForRole(
            'Admin',
            "New approval request: Quotation {$quotation->quotation_number}",
            'info',
            '/approvals'
        );

        return response()->json([
            'message' => 'Quotation submitted for approval successfully',
            'approval' => $approval->load(['user'])
        ]);
    }

    /**
     * Get my approval requests
     */
    public function myRequests()
    {
        $approvals = Approval::with(['user', 'approver', 'approvable'])
            ->where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($approvals);
    }

    /**
     * Get approvals I need to process
     */
    public function pendingForMe()
    {
        $approvals = Approval::with(['user', 'approvable'])
            ->where('status', 'PENDING')
            ->whereDoesntHave('approver')
            ->orderBy('created_at', 'asc')
            ->paginate(10);

        return response()->json($approvals);
    }
}
