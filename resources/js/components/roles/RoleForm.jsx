import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * RoleForm component for creating/editing roles with permissions
 * @param {object} formData - Form data
 * @param {Function} onChange - Change handler
 * @param {Function} onSubmit - Submit handler
 * @param {object} groupedPermissions - Permissions grouped by module
 */
export function RoleForm({
    formData,
    onChange,
    onSubmit,
    groupedPermissions = {}
}) {
    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value })
    }

    const handlePermissionChange = (permissionId, checked) => {
        const currentPermissions = formData.permissions || [];
        let newPermissions;

        if (checked) {
            newPermissions = [...currentPermissions, permissionId];
        } else {
            newPermissions = currentPermissions.filter(id => id !== permissionId);
        }

        onChange({ ...formData, permissions: newPermissions });
    }

    const handleGroupChange = (permissionsInGroup, checked) => {
        const currentPermissions = formData.permissions || [];
        const groupPermissionIds = permissionsInGroup.map(p => p.id);
        let newPermissions;

        if (checked) {
            // Add all permissions in group that aren't already selected
            const toAdd = groupPermissionIds.filter(id => !currentPermissions.includes(id));
            newPermissions = [...currentPermissions, ...toAdd];
        } else {
            // Remove all permissions in group
            newPermissions = currentPermissions.filter(id => !groupPermissionIds.includes(id));
        }

        onChange({ ...formData, permissions: newPermissions });
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter role name"
                    required
                />
            </div>

            <div className="space-y-4">
                <Label className="text-base font-semibold">Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                    {Object.entries(groupedPermissions).map(([group, permissions]) => {
                        if (!Array.isArray(permissions)) return null;

                        const allChecked = permissions.every(p => (formData.permissions || []).includes(p.id));
                        const someChecked = permissions.some(p => (formData.permissions || []).includes(p.id));

                        return (
                            <Card key={group} className="border shadow-sm">
                                <CardHeader className="py-3 px-4 bg-gray-50 border-b flex flex-row items-center space-y-0">
                                    <div className="flex items-center space-x-2 w-full">
                                        <Checkbox
                                            id={`group-${group}`}
                                            checked={allChecked}
                                            onCheckedChange={(checked) => handleGroupChange(permissions, checked)}
                                        />
                                        <Label htmlFor={`group-${group}`} className="font-semibold cursor-pointer flex-1">
                                            {group}
                                        </Label>
                                    </div>
                                </CardHeader>
                                <CardContent className="py-3 px-4">
                                    <div className="space-y-2">
                                        {permissions.map(permission => (
                                            <div key={permission.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`perm-${permission.id}`}
                                                    checked={(formData.permissions || []).includes(permission.id)}
                                                    onCheckedChange={(checked) => handlePermissionChange(permission.id, checked)}
                                                />
                                                <Label htmlFor={`perm-${permission.id}`} className="text-sm font-normal cursor-pointer">
                                                    {permission.display_name || permission.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}
