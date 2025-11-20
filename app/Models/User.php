<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'warehouse_id',
        'can_access_multiple_warehouses',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    
    public function role()
    {
        return $this->belongsTo(Role::class);
    }
    
    public function quotations()
    {
        return $this->hasMany(Quotation::class);
    }
    
    public function salesOrders()
    {
        return $this->hasMany(SalesOrder::class);
    }
    
    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class);
    }
    
    public function goodsReceipts()
    {
        return $this->hasMany(GoodsReceipt::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function managedWarehouse()
    {
        return $this->hasOne(Warehouse::class, 'manager_id');
    }

    public function transfersRequested()
    {
        return $this->hasMany(WarehouseTransfer::class, 'requested_by');
    }

    public function transfersApproved()
    {
        return $this->hasMany(WarehouseTransfer::class, 'approved_by');
    }

    // Helper methods for warehouse access
    public function canAccessWarehouse($warehouseId): bool
    {
        // Delegate to role for warehouse access permissions
        return $this->role ? $this->role->canAccessWarehouse($warehouseId) : false;
    }

    
    public function isWarehouseManager(): bool
    {
        return $this->managedWarehouse !== null;
    }

    public function getAccessibleWarehouses()
    {
        if ($this->can_access_multiple_warehouses) {
            return Warehouse::active()->get();
        }

        return $this->warehouse ? collect([$this->warehouse]) : collect();
    }

    // Permission methods delegated to role
    public function hasPermission(string $resource, string $action): bool
    {
        return $this->role ? $this->role->hasPermission($resource, $action) : false;
    }

    public function canPerformAction(string $action, string $resource, $context = null): bool
    {
        return $this->role ? $this->role->canPerformAction($action, $resource, $context) : false;
    }

    public function canAccessWarehouses(): bool
    {
        return $this->role ? $this->role->canAccessWarehouses() : false;
    }

    public function canAccessAllWarehouses(): bool
    {
        return $this->can_access_multiple_warehouses ||
               ($this->role ? $this->role->canAccessAllWarehouses() : false);
    }

    public function canApproveTransfers(): bool
    {
        return $this->role ? $this->role->canApproveTransfers() : false;
    }

    public function canManageWarehouse($warehouseId): bool
    {
        // Check if user is warehouse manager
        $managedWarehouse = $this->managedWarehouse;
        if ($managedWarehouse && $managedWarehouse->id == $warehouseId) {
            return true;
        }

        // Check if role allows management
        return $this->canAccessAllWarehouses() || $this->canAccessWarehouse($warehouseId);
    }

    public function isHigherOrEqualThan(User $otherUser): bool
    {
        if (!$this->role || !$otherUser->role) {
            return false;
        }

        return $this->role->isHigherOrEqual($otherUser->role);
    }

    public function isManagementRole(): bool
    {
        return $this->role ? $this->role->isManagementRole() : false;
    }

    public function isWarehouseRole(): bool
    {
        return $this->role ? $this->role->isWarehouseRole() : false;
    }

    public function getHierarchyLevel(): int
    {
        return $this->role ? $this->role->hierarchy_level : 0;
    }

    /**
     * Get user's full display name with role
     */
    public function getDisplayNameWithRole(): string
    {
        $roleName = $this->role ? $this->role->name : 'No Role';
        return "{$this->name} ({$roleName})";
    }

    /**
     * Check if user can create quotations
     */
    public function canCreateQuotations(): bool
    {
        return $this->hasPermission('quotations', 'create');
    }

    /**
     * Check if user can approve quotations
     */
    public function canApproveQuotations(): bool
    {
        return $this->hasPermission('quotations', 'approve') && $this->canApproveTransfers();
    }

    /**
     * Check if user can create sales orders
     */
    public function canCreateSalesOrders(): bool
    {
        return $this->hasPermission('sales_orders', 'create');
    }

    /**
     * Check if user can manage products
     */
    public function canManageProducts(): bool
    {
        return $this->hasPermission('products', 'update') || $this->hasPermission('products', 'delete');
    }

    /**
     * Check if user can view reports
     */
    public function canViewReports(): bool
    {
        return $this->hasPermission('reports', 'read');
    }
}
