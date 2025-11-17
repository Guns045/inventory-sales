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
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
                'warehouse-transfers' => ['read', 'create', 'update', 'delete'],
                'activity-logs' => ['read'],
                'approvals' => ['read', 'approve', 'reject'],
                'reports' => ['read'],
                'dashboard' => ['read', 'admin', 'sales', 'warehouse', 'finance', 'approval']
            ],
            'Sales' => [
                'dashboard' => ['read', 'sales'],
                'customers' => ['read', 'create'],
                'stock' => ['read'],
                'quotations' => ['read', 'create', 'update', 'submit', 'convert'],
                'sales_orders' => ['read'],
                'invoices' => ['read']
            ],
            'Sales Team' => [
                'dashboard' => ['read', 'sales'],
                'customers' => ['read', 'create', 'update'],
                'stock' => ['read'],
                'product-stock' => ['read'],  // Read-only access only
                'quotations' => ['read', 'create', 'update', 'submit', 'convert'],
                'sales_orders' => ['read'],
                'sales-orders' => ['read'],
                'invoices' => ['read'],
                'activity-logs' => ['read'],
                'notifications' => ['read']
            ],
            'Warehouse Manager Gudang JKT' => [
                'products' => ['read', 'update'],
                'categories' => ['read'],
                'suppliers' => ['read'],
                'warehouses' => ['read'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'delivery-orders' => ['read', 'update'],
                'purchase-orders' => ['read', 'create'],
                'goods-receipts' => ['read', 'create', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
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
            ],
            // New role mappings
            'Super Admin' => [
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
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
                'warehouse-transfers' => ['read', 'create', 'update', 'delete', 'approve'],
                'activity-logs' => ['read'],
                'approvals' => ['read', 'approve', 'reject'],
                'reports' => ['read'],
                'dashboard' => ['read', 'admin', 'sales', 'warehouse', 'finance', 'approval']
            ],
            'Warehouse Manager Gudang JKT' => [
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'product-stock' => ['read', 'create', 'update'],
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
                'delivery-orders' => ['read', 'create', 'update'],
                'warehouse-transfers' => ['read', 'create', 'approve'],
                'goods-receipts' => ['read', 'create', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Admin Jakarta' => [
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'purchase-orders' => ['read', 'create', 'update', 'delete'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Manager Jakarta' => [
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'purchase-orders' => ['read', 'create', 'update', 'delete'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Warehouse Manager Gudang MKS' => [
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'product-stock' => ['read', 'create', 'update'],
                'picking-lists' => ['read', 'create', 'update', 'complete', 'print'],
                'delivery-orders' => ['read', 'create', 'update'],
                'warehouse-transfers' => ['read', 'create', 'approve'],
                'purchase-orders' => ['read', 'create'],
                'goods-receipts' => ['read', 'create', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Admin Makassar' => [
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'purchase-orders' => ['read', 'create', 'update', 'delete'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Manager Makassar' => [
                'products' => ['read', 'update'],
                'warehouses' => ['read', 'update'],
                'stock_movements' => ['create', 'read', 'update'],
                'delivery-orders' => ['create', 'read', 'update'],
                'transfers' => ['create', 'read', 'approve'],
                'purchase-orders' => ['read', 'create', 'update', 'delete'],
                'goods-receipts' => ['create', 'read', 'update'],
                'product-stock' => ['read', 'create', 'update', 'delete'],
                'picking-lists' => ['create', 'read', 'update'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Warehouse Staff' => [
                'products' => ['read'],
                'warehouses' => ['read'],
                'product-stock' => ['read'],
                'picking-lists' => ['read', 'create', 'update'],
                'delivery-orders' => ['read', 'create', 'update'],
                'purchase-orders' => ['read'],
                'goods-receipts' => ['read', 'create', 'update'],
                'reports' => ['read'],
                'dashboard' => ['read', 'warehouse']
            ],
            'Finance Team' => [
                'customers' => ['read'],
                'suppliers' => ['read'],
                'quotations' => ['read'],
                'sales-orders' => ['read'],
                'invoices' => ['read', 'create', 'update'],
                'payments' => ['read', 'create', 'update'],
                'purchase-orders' => ['read'],
                'goods-receipts' => ['read'],
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