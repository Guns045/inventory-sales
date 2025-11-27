<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display a listing of the resource with search, filters, and pagination.
     */
    public function index(Request $request)
    {
        $query = User::with(['roles', 'warehouse']);

        // Search by name or email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->filled('status') && $request->status !== '') {
            $status = $request->status == '1' ? 1 : 0;
            $query->where('is_active', $status);
        }

        // Filter by role
        if ($request->filled('role') && $request->role !== '') {
            $query->where('role_id', $request->role);
        }

        // Paginate results
        $users = $query->paginate($request->get('per_page', 10));

        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => 'required|exists:roles,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'can_access_multiple_warehouses' => 'boolean'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $request->role_id,
            'warehouse_id' => $request->warehouse_id,
            'can_access_multiple_warehouses' => $request->boolean('can_access_multiple_warehouses', false),
            'is_active' => 1 // Default to active
        ]);

        // Assign Spatie role
        if ($request->role_id) {
            $role = Role::find($request->role_id);
            if ($role) {
                $user->assignRole($role);
            }
        }

        // Load relationships for response
        $user->load(['role', 'warehouse']);

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $user = User::with(['roles', 'warehouse'])->findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'role_id' => 'required|exists:roles,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'can_access_multiple_warehouses' => 'boolean'
        ]);

        $updateData = [
            'name' => $request->name,
            'email' => $request->email,
            'role_id' => $request->role_id,
            'warehouse_id' => $request->warehouse_id,
            'can_access_multiple_warehouses' => $request->boolean('can_access_multiple_warehouses', false)
        ];

        $user->update($updateData);

        // Update password if provided
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
            $user->save();
        }

        // Update Spatie role
        if ($request->role_id) {
            $role = Role::find($request->role_id);
            if ($role) {
                $user->syncRoles([$role]);
            }
        }

        // Load relationships for response
        $user->load(['role', 'warehouse']);

        return response()->json($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Update user status (activate/deactivate)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:activate,deactivate',
            'is_active' => 'required|boolean'
        ]);

        $user = User::findOrFail($id);
        $user->update(['is_active' => $request->is_active]);

        return response()->json([
            'message' => "User {$request->status}d successfully",
            'user' => $user
        ]);
    }

    /**
     * Bulk activate users
     */
    public function bulkActivate(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id'
        ]);

        $updated = User::whereIn('id', $request->user_ids)
            ->update(['is_active' => 1]);

        return response()->json([
            'message' => "Successfully activated {$updated} users",
            'updated_count' => $updated
        ]);
    }

    /**
     * Bulk deactivate users
     */
    public function bulkDeactivate(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id'
        ]);

        $updated = User::whereIn('id', $request->user_ids)
            ->update(['is_active' => 0]);

        return response()->json([
            'message' => "Successfully deactivated {$updated} users",
            'updated_count' => $updated
        ]);
    }

    /**
     * Bulk delete users
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id'
        ]);

        $deleted = User::whereIn('id', $request->user_ids)
            ->delete();

        return response()->json([
            'message' => "Successfully deleted {$deleted} users",
            'deleted_count' => $deleted
        ]);
    }

    /**
     * Bulk assign role to users
     */
    public function bulkAssignRole(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'role_id' => 'required|exists:roles,id'
        ]);

        $role = Role::findOrFail($request->role_id);
        $updated = 0;

        User::whereIn('id', $request->user_ids)
            ->get()
            ->each(function ($user) use ($role, &$updated) {
                $user->update(['role_id' => $role->id]);
                $user->syncRoles([$role]);
                $updated++;
            });

        return response()->json([
            'message' => "Successfully assigned {$role->name} role to {$updated} users",
            'updated_count' => $updated
        ]);
    }
}
