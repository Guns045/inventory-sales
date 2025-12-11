<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $guard_name = 'web';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'warehouse_id',
        'can_access_multiple_warehouses',
        'is_active',
        'avatar',
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
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['role', 'role_id', 'avatar_url'];

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

    public function getAvatarUrlAttribute()
    {
        return $this->avatar ? asset('storage/' . $this->avatar) : null;
    }

    // Relationship to Spatie Role (optional, if we want to keep accessing single role easily)
    // But Spatie supports multiple roles. For this app, we assume 1 user = 1 role usually.
    // We will use Spatie's roles() relation.

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
        if ($this->canAccessAllWarehouses()) {
            return true;
        }
        return $this->warehouse_id == $warehouseId;
    }


    public function isWarehouseManager(): bool
    {
        return $this->managedWarehouse !== null;
    }

    public function getAccessibleWarehouses()
    {
        if ($this->canAccessAllWarehouses()) {
            return Warehouse::active()->get();
        }

        return $this->warehouse ? collect([$this->warehouse]) : collect();
    }

    // Permission methods using Spatie
    public function hasPermission(string $resource, string $action): bool
    {
        // Super Admin has all permissions
        if ($this->hasRole('Super Admin')) {
            return true;
        }

        // Try direct match first (noun.verb)
        $permission = "{$resource}.{$action}";
        try {
            if ($this->hasPermissionTo($permission)) {
                return true;
            }
        } catch (\Spatie\Permission\Exceptions\PermissionDoesNotExist $e) {
            // Continue to try legacy format
        }

        // Map action for legacy format (verb_noun)
        $legacyAction = $action;
        if ($action === 'read')
            $legacyAction = 'view';
        if ($action === 'update')
            $legacyAction = 'edit';

        $legacyPermission = "{$legacyAction}_{$resource}";

        try {
            return $this->hasPermissionTo($legacyPermission);
        } catch (\Spatie\Permission\Exceptions\PermissionDoesNotExist $e) {
            return false;
        }
    }

    public function canPerformAction(string $action, string $resource, $context = null): bool
    {
        return $this->hasPermission($resource, $action);
    }

    public function canAccessWarehouses(): bool
    {
        return $this->hasPermissionTo('warehouses.read');
    }

    public function canAccessAllWarehouses(): bool
    {
        return $this->can_access_multiple_warehouses || $this->hasRole('Super Admin') || $this->hasRole('Admin');
    }

    public function canApproveTransfers(): bool
    {
        return $this->hasPermission('transfers', 'approve');
    }

    public function canManageWarehouse($warehouseId): bool
    {
        // Check if user is warehouse manager
        $managedWarehouse = $this->managedWarehouse;
        if ($managedWarehouse && $managedWarehouse->id == $warehouseId) {
            return true;
        }

        // Check if role allows management
        return $this->canAccessAllWarehouses();
    }

    public function isHigherOrEqualThan(User $otherUser): bool
    {
        // Simplified hierarchy check based on roles
        $hierarchy = [
            'Super Admin' => 100,
            'Admin' => 90,
            'Manager Jakarta' => 80,
            'Manager Makassar' => 80,
            'Admin Jakarta' => 70,
            'Admin Makassar' => 70,
            'Sales Team' => 50,
            'Gudang' => 40,
        ];

        $myRole = $this->getRoleNames()->first();
        $otherRole = $otherUser->getRoleNames()->first();

        $myLevel = $hierarchy[$myRole] ?? 0;
        $otherLevel = $hierarchy[$otherRole] ?? 0;

        return $myLevel >= $otherLevel;
    }

    public function isManagementRole(): bool
    {
        $role = $this->getRoleNames()->first();
        return in_array($role, ['Super Admin', 'Admin', 'Manager Jakarta', 'Manager Makassar']);
    }

    public function isWarehouseRole(): bool
    {
        $role = $this->getRoleNames()->first();
        return str_contains(strtolower($role ?? ''), 'gudang') ||
            str_contains(strtolower($role ?? ''), 'warehouse');
    }

    public function getHierarchyLevel(): int
    {
        $hierarchy = [
            'Super Admin' => 100,
            'Admin' => 90,
            'Manager Jakarta' => 80,
            'Manager Makassar' => 80,
            'Admin Jakarta' => 70,
            'Admin Makassar' => 70,
            'Sales Team' => 50,
            'Gudang' => 40,
        ];
        $role = $this->getRoleNames()->first();
        return $hierarchy[$role] ?? 0;
    }

    /**
     * Get user's full display name with role
     */
    public function getDisplayNameWithRole(): string
    {
        $roleName = $this->getRoleNames()->first() ?? 'No Role';
        return "{$this->name} ({$roleName})";
    }

    /**
     * Check if user can create quotations
     */
    public function canCreateQuotations(): bool
    {
        return $this->hasPermissionTo('quotations.create');
    }

    /**
     * Check if user can approve quotations
     */
    public function canApproveQuotations(): bool
    {
        return $this->hasPermissionTo('quotations.approve');
    }

    /**
     * Check if user can create sales orders
     */
    public function canCreateSalesOrders(): bool
    {
        return $this->hasPermissionTo('sales_orders.create');
    }

    /**
     * Check if user can manage products
     */
    public function canManageProducts(): bool
    {
        return $this->hasPermissionTo('products.update') || $this->hasPermissionTo('products.delete');
    }

    /**
     * Check if user can view reports
     */
    public function canViewReports(): bool
    {
        return $this->hasPermissionTo('reports.read');
    }

    /**
     * Get the user's primary role.
     */
    public function getRoleAttribute()
    {
        return $this->roles->first();
    }

    /**
     * Get the user's primary role ID.
     */
    public function getRoleIdAttribute()
    {
        return $this->roles->first()?->id;
    }
}
