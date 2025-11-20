<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = [
        'name',
        'description',
        'permissions',
        'warehouse_access_level',
        'can_approve_transfers',
        'can_manage_all_warehouses',
        'hierarchy_level',
    ];

    protected $casts = [
        'permissions' => 'array',
        'can_approve_transfers' => 'boolean',
        'can_manage_all_warehouses' => 'boolean',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Check if role has specific permission
     */
    public function hasPermission(string $resource, string $action): bool
    {
        if (!$this->permissions) {
            return false;
        }

        $resourcePermissions = $this->permissions[$resource] ?? [];
        return in_array($action, $resourcePermissions);
    }

    /**
     * Check if role can access any warehouse
     */
    public function canAccessWarehouses(): bool
    {
        return in_array($this->warehouse_access_level, ['specific', 'all']);
    }

    /**
     * Check if role can access all warehouses
     */
    public function canAccessAllWarehouses(): bool
    {
        return $this->warehouse_access_level === 'all' || $this->can_manage_all_warehouses;
    }

    /**
     * Check if role can access specific warehouse
     */
    public function canAccessWarehouse($warehouseId): bool
    {
        // If role can access all warehouses, return true
        if ($this->canAccessAllWarehouses()) {
            return true;
        }

        // If role has specific warehouse access, check assigned warehouses
        if ($this->warehouse_access_level === 'specific') {
            // This would need to be implemented based on user-warehouse relationships
            // For now, return false for specific access
            return false;
        }

        return false;
    }

    /**
     * Check if role is higher or equal in hierarchy
     */
    public function isHigherOrEqual(Role $otherRole): bool
    {
        return $this->hierarchy_level >= $otherRole->hierarchy_level;
    }

    /**
     * Check if role can approve transfers
     */
    public function canApproveTransfers(): bool
    {
        return $this->can_approve_transfers || $this->can_manage_all_warehouses;
    }

    /**
     * Get all available permissions for this role
     */
    public function getAllPermissions(): array
    {
        return $this->permissions ?? [];
    }

    /**
     * Check if user with this role can perform action on resource
     */
    public function canPerformAction(string $action, string $resource, $context = null): bool
    {
        // Check basic permission
        if (!$this->hasPermission($resource, $action)) {
            return false;
        }

        // Special checks for warehouse-specific resources
        if (in_array($resource, ['warehouses', 'stock_movements', 'transfers']) && $context) {
            if (!$this->canAccessWarehouses()) {
                return false;
            }

            if (!$this->canAccessAllWarehouses() && isset($context['warehouse_id'])) {
                return $this->canAccessSpecificWarehouse($context['warehouse_id']);
            }
        }

        // Special approval checks
        if ($action === 'approve' && in_array($resource, ['quotations', 'transfers'])) {
            return $this->canApproveTransfers();
        }

        return true;
    }

    /**
     * Check if role can access specific warehouse
     */
    private function canAccessSpecificWarehouse($warehouseId): bool
    {
        // This would be implemented based on user assignments
        // For now, assume specific access means user can access their assigned warehouse
        return true;
    }

    /**
     * Scopes
     */
    public function scopeByHierarchy($query, $direction = 'desc')
    {
        return $query->orderBy('hierarchy_level', $direction);
    }

    public function scopeCanApprove($query)
    {
        return $query->where('can_approve_transfers', true);
    }

    public function scopeManageAllWarehouses($query)
    {
        return $query->where('can_manage_all_warehouses', true);
    }

    /**
     * Role constants for easy reference
     */
    public const SUPER_ADMIN = 'Super Admin';
    public const WAREHOUSE_MANAGER_JKT = 'Warehouse Manager Gudang JKT';
    public const WAREHOUSE_MANAGER_MKS = 'Warehouse Manager Gudang MKS';
    public const SALES_TEAM = 'Sales Team';
    public const FINANCE_TEAM = 'Finance Team';
    public const WAREHOUSE_STAFF = 'Warehouse Staff';

    /**
     * Check if this is a management role
     */
    public function isManagementRole(): bool
    {
        return $this->hierarchy_level >= 50;
    }

    /**
     * Check if this is a warehouse-related role
     */
    public function isWarehouseRole(): bool
    {
        return str_contains(strtolower($this->name), 'gudang') ||
               str_contains(strtolower($this->name), 'warehouse');
    }
}
