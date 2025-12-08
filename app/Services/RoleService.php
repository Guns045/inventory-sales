<?php

namespace App\Services;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Config;

class RoleService
{
    /**
     * Get permissions for a specific role
     */
    public function getRolePermissions(string $roleName): array
    {
        try {
            $role = Role::findByName($roleName, 'sanctum');
        } catch (\Exception $e) {
            try {
                $role = Role::findByName($roleName, 'web');
            } catch (\Exception $e2) {
                // Log error if role not found in either guard
                \Illuminate\Support\Facades\Log::error("Role not found: {$roleName}");
                throw $e2;
            }
        }

        if ($roleName === 'Super Admin') {
            // For Super Admin, return ALL permissions
            $permissions = Permission::pluck('name')->toArray();
        } else {
            $permissions = $role->permissions->pluck('name')->toArray();
        }

        // Generate menu based on permissions
        $menuItems = $this->getMenuForRole($role);

        return [
            'role' => $roleName,
            'permissions' => $permissions,
            'menu_items' => $menuItems
        ];
    }

    /**
     * Generate menu structure for a role
     */
    public function getMenuForRole(Role $role): array
    {
        // Custom Menu for Sales Role
        if ($role->name === 'Sales') {
            return [
                [
                    'title' => 'Dashboard',
                    'path' => '/dashboard/sales',
                    'icon' => 'bi-speedometer2',
                    'permission' => 'dashboard.sales',
                ],
                [
                    'title' => 'Customer',
                    'path' => '/customers',
                    'icon' => 'bi-people',
                    'permission' => 'customers.read',
                ],
                [
                    'title' => 'Quotation',
                    'path' => '/quotations',
                    'icon' => 'bi-file-text',
                    'permission' => 'quotations.read',
                ],
                [
                    'title' => 'Sales Order',
                    'path' => '/sales-orders',
                    'icon' => 'bi-cart',
                    'permission' => 'sales-orders.read',
                ],
                [
                    'title' => 'Sales Return',
                    'path' => '/sales-returns',
                    'icon' => 'bi-arrow-return-left',
                    'permission' => 'sales-returns.read',
                ],
                [
                    'title' => 'On Hands Stock',
                    'path' => '/product-stock',
                    'icon' => 'bi-box-seam',
                    'permission' => 'product-stock.read',
                ],
                [
                    'title' => 'Invoice',
                    'path' => '/invoices',
                    'icon' => 'bi-receipt',
                    'permission' => 'invoices.read',
                ],
                [
                    'title' => 'Payment',
                    'path' => '/payments',
                    'icon' => 'bi-credit-card',
                    'permission' => 'payments.read',
                ],
                [
                    'title' => 'Logout',
                    'path' => '#',
                    'icon' => 'bi-box-arrow-right',
                    'permission' => null,
                    'action' => 'logout'
                ]
            ];
        }

        // Custom Menu for Warehouse Role
        if ($role->name === 'Warehouse') {
            return [
                [
                    'title' => 'Dashboard',
                    'path' => '/dashboard/warehouse',
                    'icon' => 'bi-speedometer2',
                    'permission' => 'dashboard.warehouse',
                ],
                [
                    'title' => 'On Hands Stock',
                    'path' => '/product-stock',
                    'icon' => 'bi-box-seam',
                    'permission' => 'product-stock.read',
                ],
                [
                    'title' => 'Warehouse Transfer',
                    'path' => '/internal-transfers',
                    'icon' => 'bi-arrow-left-right',
                    'permission' => 'warehouse-transfers.read',
                ],
                [
                    'title' => 'Delivery Order',
                    'path' => '/delivery-orders',
                    'icon' => 'bi-truck',
                    'permission' => 'delivery-orders.read',
                ],
                [
                    'title' => 'Sales Returns',
                    'path' => '/sales-returns',
                    'icon' => 'bi-arrow-return-left',
                    'permission' => 'sales-returns.read',
                ],
                [
                    'title' => 'Goods Receipt',
                    'path' => '/goods-receipts',
                    'icon' => 'bi-clipboard-data',
                    'permission' => 'goods-receipts.read',
                ],
                [
                    'title' => 'Logout',
                    'path' => '#',
                    'icon' => 'bi-box-arrow-right',
                    'permission' => null,
                    'action' => 'logout'
                ]
            ];
        }

        // Custom Menu for Finance Role
        if ($role->name === 'Finance') {
            return [
                [
                    'title' => 'Dashboard',
                    'path' => '/dashboard/finance',
                    'icon' => 'bi-speedometer2',
                    'permission' => 'dashboard.finance',
                ],
                [
                    'title' => 'Invoices',
                    'path' => '/invoices',
                    'icon' => 'bi-receipt',
                    'permission' => 'invoices.read',
                ],
                [
                    'title' => 'Payments',
                    'path' => '/payments',
                    'icon' => 'bi-credit-card',
                    'permission' => 'payments.read',
                ],
                [
                    'title' => 'Purchase Orders',
                    'path' => '/purchase-orders',
                    'icon' => 'bi-cart-check',
                    'permission' => 'purchase-orders.read',
                ],
                [
                    'title' => 'Customers',
                    'path' => '/customers',
                    'icon' => 'bi-people',
                    'permission' => 'customers.read',
                ],
                [
                    'title' => 'Sales Orders',
                    'path' => '/sales-orders',
                    'icon' => 'bi-cart',
                    'permission' => 'sales-orders.read',
                ],
                [
                    'title' => 'Sales Returns',
                    'path' => '/sales-returns',
                    'icon' => 'bi-arrow-return-left',
                    'permission' => 'sales-returns.read',
                ],
                [
                    'title' => 'Credit Notes',
                    'path' => '/credit-notes',
                    'icon' => 'bi-file-earmark-minus',
                    'permission' => 'sales-returns.read',
                ],
                [
                    'title' => 'Logout',
                    'path' => '#',
                    'icon' => 'bi-box-arrow-right',
                    'permission' => null,
                    'action' => 'logout'
                ]
            ];
        }

        $menuConfig = Config::get('menu');
        $userMenu = [];

        foreach ($menuConfig as $item) {
            if ($this->canAccessMenuItem($role, $item)) {
                $menuItem = [
                    'title' => $item['title'],
                    'path' => $item['path'],
                    'icon' => $item['icon'],
                    'permission' => $item['permission'],
                ];

                // Custom Dashboard Path for Sales Role
                if ($item['title'] === 'Dashboard' && $role->name === 'Sales') {
                    $menuItem['path'] = '/dashboard/sales';
                }

                if (isset($item['action'])) {
                    $menuItem['action'] = $item['action'];
                }

                if (isset($item['children'])) {
                    $children = [];
                    foreach ($item['children'] as $child) {
                        if ($this->canAccessMenuItem($role, $child)) {
                            $children[] = [
                                'title' => $child['title'],
                                'path' => $child['path'],
                                'icon' => $child['icon'],
                                'permission' => $child['permission']
                            ];
                        }
                    }

                    if (!empty($children)) {
                        $menuItem['children'] = $children;
                        $userMenu[] = $menuItem;
                    }
                } else {
                    $userMenu[] = $menuItem;
                }
            }
        }

        return $userMenu;
    }

    /**
     * Check if role can access a menu item
     */
    private function canAccessMenuItem(Role $role, array $item): bool
    {
        // Super Admin has access to everything
        if ($role->name === 'Super Admin') {
            return true;
        }

        // If permission is null (like Logout), everyone can access
        if ($item['permission'] === null) {
            return true;
        }

        return $role->hasPermissionTo($item['permission']);
    }

    /**
     * Create a new role
     */
    public function createRole(string $name, string $description = null): Role
    {
        return Role::create([
            'name' => $name,
            'guard_name' => 'web',
            // Note: Spatie Role doesn't have description by default, 
            // we might need to add it via migration if strictly required,
            // or just ignore it for now as per standard Spatie implementation.
        ]);
    }

    /**
     * Sync permissions to a role
     */
    public function syncPermissions(Role $role, array $permissions): void
    {
        $role->syncPermissions($permissions);
    }
}
