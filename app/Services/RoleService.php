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
        $role = Role::findByName($roleName);
        $permissions = $role->permissions->pluck('name')->toArray();

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
