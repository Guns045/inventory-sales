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

        // Debug logging
        \Log::info("PermissionMiddleware: Checking permission: {$permission} for user: " . ($user ? $user->email : 'null'));
        \Log::info("PermissionMiddleware: Request URI: {$request->getUri()}");

        if (!$user) {
            \Log::warning("PermissionMiddleware: No authenticated user found");
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Get user permissions
        $userPermissions = $this->getUserPermissions($user);
        \Log::info("PermissionMiddleware: User role: " . (is_string($user->role) ? $user->role : $user->role->name));
        \Log::info("PermissionMiddleware: User permissions: " . json_encode($userPermissions));

        // Parse permission (format: resource.action)
        list($resource, $action) = explode('.', $permission);
        \Log::info("PermissionMiddleware: Required permission - Resource: {$resource}, Action: {$action}");

        if (!$this->hasPermission($userPermissions, $resource, $action)) {
            \Log::warning("PermissionMiddleware: Permission denied for user {$user->email} - missing {$permission}");
            $userRoleName = is_string($user->role) ? $user->role : $user->role->name;
            return response()->json([
                'message' => 'Forbidden - Insufficient permissions',
                'required' => $permission,
                'user_role' => $userRoleName
            ], 403);
        }

        \Log::info("PermissionMiddleware: Permission granted for user {$user->email} - {$permission}");
        $response = $next($request);

        // Log performance if permission check takes more than 100ms
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
        $roleName = is_string($user->role) ? $user->role : $user->role->name;

        $rolePermissions = [
            'Admin' => [
                'users' => ['read', 'create', 'update', 'delete'],
                'products' => ['read', 'create', 'update', 'delete'],
                'categories' => ['read', 'create', 'update', 'delete'],
                'suppliers' => ['read', 'create', 'update', 'delete'],
                'customers' => ['read', 'create', 'update', 'delete'],
                'warehouses' => ['read', 'create', 'update', 'delete'],
                'quotations' => ['read', 'create', 'update', 'delete', 'approve', 'reject'],
                'sales-orders' => ['read', 'create', 'update', 'delete'],
                'delivery-orders' => ['read', 'create', 'update', 'delete'],
                'invoices' => ['read', 'create', 'update', 'delete'],
                'payments' => ['read', 'create', 'update', 'delete'],
                'purchase-orders' => ['read', 'create', 'update', 'delete'],
                'goods-receipts' => ['read', 'create', 'update', 'delete'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'activity-logs' => ['read'],
                'approvals' => ['read', 'approve', 'reject'],
                'reports' => ['read'],
                'dashboard' => ['read', 'admin', 'sales', 'warehouse', 'finance', 'approval']
            ],
            'Sales' => [
                'customers' => ['read', 'create', 'update'],
                'quotations' => ['read', 'create', 'update'],
                'sales-orders' => ['read', 'create', 'update'],
                'delivery-orders' => ['read', 'create'],
                'product-stock' => ['read'],
                'activity-logs' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'sales']
            ],
            'Gudang' => [
                'products' => ['read', 'update'],
                'categories' => ['read'],
                'suppliers' => ['read'],
                'warehouses' => ['read'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'delivery-orders' => ['read', 'update'],
                'purchase-orders' => ['read', 'create'],
                'goods-receipts' => ['read', 'create', 'update'],
                'product-stock' => ['read'],
                'activity-logs' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Finance' => [
                'customers' => ['read'],
                'suppliers' => ['read'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'invoices' => ['read', 'create', 'update'],
                'payments' => ['read', 'create', 'update'],
                'product-stock' => ['read'],
                'activity-logs' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'finance']
            ]
        ];

        return $rolePermissions[$roleName] ?? [];
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