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
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Super Admin bypass
        if ($user->hasRole('Super Admin')) {
            return $next($request);
        }

        // Check permission using standard Laravel Gate (which integrates with Spatie)
        // This also respects the Gate::before rule in AppServiceProvider if defined
        if ($user->can($permission)) {
            return $next($request);
        }

        // Fallback: Check if user has permission directly (Spatie method)
        if ($user->hasPermissionTo($permission)) {
            return $next($request);
        }

        // Log the denial for debugging
        $userRoleName = $user->getRoleNames()->first() ?? 'None';
        \Log::warning("Permission Denied: User {$user->id} ({$userRoleName}) attempted to access {$permission}");

        return response()->json([
            'message' => 'Forbidden - Insufficient permissions',
            'required_permission' => $permission,
            'user_role' => $userRoleName
        ], 403);
    }
}