<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use App\Services\RoleService;

class RoleController extends Controller
{
    protected $roleService;

    public function __construct(RoleService $roleService)
    {
        $this->roleService = $roleService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles',
        ]);

        $role = $this->roleService->createRole($request->name);

        if ($request->has('permissions')) {
            $this->roleService->syncPermissions($role, $request->permissions);
        }

        return response()->json($role->load('permissions'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $role = Role::with('permissions')->findOrFail($id);
        return response()->json($role);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $id,
        ]);

        $role->update(['name' => $request->name]);

        if ($request->has('permissions')) {
            $this->roleService->syncPermissions($role, $request->permissions);
        }

        return response()->json($role->load('permissions'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        // Prevent deleting critical roles
        if (in_array($role->name, ['Super Admin', 'Admin', 'Sales', 'Warehouse'])) {
            return response()->json(['message' => 'Cannot delete system roles'], 403);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    /**
     * Get user permissions and menu items based on role
     */
    public function getUserPermissions(Request $request)
    {
        $user = $request->user();

        // Get role name (Spatie uses getRoleNames() which returns a collection)
        $roleName = $user->getRoleNames()->first();

        if (!$roleName) {
            return response()->json(['message' => 'User has no role assigned'], 403);
        }

        $data = $this->roleService->getRolePermissions($roleName);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
                'avatar_url' => $user->avatar_url,
            ],
            'permissions' => $data['permissions'],
            'menu_items' => $data['menu_items']
        ]);
    }
}
