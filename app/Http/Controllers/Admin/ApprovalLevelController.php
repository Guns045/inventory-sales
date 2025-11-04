<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApprovalLevel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ApprovalLevelController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('role:admin');
    }

    /**
     * Display a listing of approval levels.
     */
    public function index()
    {
        $levels = ApprovalLevel::with('role')
            ->orderBy('level_order')
            ->paginate(10);

        return response()->json([
            'levels' => $levels,
        ]);
    }

    /**
     * Store a newly created approval level.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'level_order' => 'required|integer|min:1',
            'role_id' => 'nullable|exists:roles,id',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Validate that max_amount is greater than min_amount if both are provided
        if (isset($validated['max_amount']) && $validated['max_amount'] <= $validated['min_amount']) {
            return response()->json([
                'message' => 'Maximum amount must be greater than minimum amount',
            ], 422);
        }

        $level = ApprovalLevel::create($validated);

        return response()->json([
            'message' => 'Approval level created successfully',
            'level' => $level->load('role'),
        ], 201);
    }

    /**
     * Display the specified approval level.
     */
    public function show(ApprovalLevel $approvalLevel)
    {
        return response()->json([
            'level' => $approvalLevel->load('role'),
        ]);
    }

    /**
     * Update the specified approval level.
     */
    public function update(Request $request, ApprovalLevel $approvalLevel)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'level_order' => 'required|integer|min:1',
            'role_id' => 'nullable|exists:roles,id',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Validate that max_amount is greater than min_amount if both are provided
        if (isset($validated['max_amount']) && $validated['max_amount'] <= $validated['min_amount']) {
            return response()->json([
                'message' => 'Maximum amount must be greater than minimum amount',
            ], 422);
        }

        $approvalLevel->update($validated);

        return response()->json([
            'message' => 'Approval level updated successfully',
            'level' => $approvalLevel->load('role'),
        ]);
    }

    /**
     * Remove the specified approval level.
     */
    public function destroy(ApprovalLevel $approvalLevel)
    {
        // Check if level is being used in any approval rules
        if ($approvalLevel->approvalRules()->exists()) {
            return response()->json([
                'message' => 'Cannot delete approval level that is being used in approval rules',
            ], 422);
        }

        $approvalLevel->delete();

        return response()->json([
            'message' => 'Approval level deleted successfully',
        ]);
    }

    /**
     * Get approvers for a specific level
     */
    public function getApprovers(ApprovalLevel $approvalLevel)
    {
        $approvers = $approvalLevel->getApprovers();

        return response()->json([
            'approvers' => $approvers,
        ]);
    }

    /**
     * Toggle active status of approval level
     */
    public function toggleActive(ApprovalLevel $approvalLevel)
    {
        $approvalLevel->update(['is_active' => !$approvalLevel->is_active]);

        return response()->json([
            'message' => 'Approval level status updated successfully',
            'level' => $approvalLevel,
        ]);
    }
}