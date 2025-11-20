<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  $permission
     * @return mixed
     */
    public function handle(Request $request, Closure $next, $permission)
    {
        $startTime = microtime(true);
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Parse permission format (resource.action)
        list($resource, $action) = explode('.', $permission, 2);

        $userPermissions = $this->getUserPermissions($user);

        if (!$this->hasPermission($userPermissions, $resource, $action)) {
            $userRoleName = is_string($user->role) ? $user->role : $user->role->name;
            \Log::error("Permission Denied: role={$userRoleName}, permission={$permission}, resource={$resource}, action={$action}, user_permissions=" . json_encode($userPermissions));
            return response()->json([
                'message' => 'Forbidden - Insufficient permissions',
                'required' => $permission,
                'resource' => $resource,
                'action' => $action,
                'user_role' => $userRoleName,
                'user_permissions' => $userPermissions
            ], 403);
        }

        $response = $next($request);

        // Log performance only for slow operations (more than 100ms)
        $duration = (microtime(true) - $startTime) * 1000;
        if ($duration > 100) {
            \Log::warning("PermissionMiddleware slow for permission: {$permission}, duration: {$duration}ms");
        }

        return $response;
    }

    /**
     * Get user permissions from role
     */
    private function getUserPermissions($user)
    {
        // Use the actual Role model's permissions from database instead of hardcoded ones
        $role = $user->role;
        if (!$role) {
            return [];
        }

        return $role->permissions ?? [];
    }

    /**
     * Check if user has specific permission
     */
    private function hasPermission($userPermissions, $resource, $action)
    {
        if (!isset($userPermissions[$resource])) {
            return false;
        }

        return in_array($action, $userPermissions[$resource]);
    }
}