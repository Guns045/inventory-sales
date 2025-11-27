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
            return response()->json([
                'message' => 'Forbidden - Insufficient permissions',
                'required' => $permission,
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
        // Use Spatie's getAllPermissions to get all permissions from roles and direct assignment
        return $user->getAllPermissions()->pluck('name')->toArray();
    }

    /**
     * Check if user has specific permission
     */
    private function hasPermission($userPermissions, $resource, $action)
    {
        $permission = "{$resource}.{$action}";

        // Check for exact permission
        if (in_array($permission, $userPermissions)) {
            return true;
        }

        // Check for wildcard resource permission (e.g. sales_orders.*)
        if (in_array("{$resource}.*", $userPermissions)) {
            return true;
        }

        // Check for global wildcard (*)
        if (in_array('*', $userPermissions)) {
            return true;
        }

        return false;
    }
}