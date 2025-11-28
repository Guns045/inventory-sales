import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { Eye, EyeOff } from "lucide-react"

/**
 * UserForm component for creating/editing users
 * @param {object} formData - Form data
 * @param {Function} onChange - Change handler
 * @param {Function} onSubmit - Submit handler
 * @param {Array} roles - Roles list
 * @param {Array} warehouses - Warehouses list
 * @param {boolean} isEditing - Edit mode flag
 */
export function UserForm({
    formData,
    onChange,
    onSubmit,
    roles = [],
    warehouses = [],
    isEditing = false
}) {
    const [showPassword, setShowPassword] = React.useState(false)

    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Enter full name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="Enter email address"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                        value={formData.role_id?.toString() || ''}
                        onValueChange={(value) => handleChange('role_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id.toString()}>
                                    {role.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse</Label>
                    <Select
                        value={formData.warehouse_id?.toString() || ''}
                        onValueChange={(value) => handleChange('warehouse_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null">None</SelectItem>
                            {warehouses.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                    {warehouse.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Password {isEditing ? '(Leave blank to keep)' : '*'}</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password || ''}
                            onChange={(e) => handleChange('password', e.target.value)}
                            placeholder={isEditing ? "********" : "Enter password"}
                            required={!isEditing}
                            minLength={8}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            tabIndex="-1"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                    <div className="relative">
                        <Input
                            id="password_confirmation"
                            type={showPassword ? "text" : "password"}
                            value={formData.password_confirmation || ''}
                            onChange={(e) => handleChange('password_confirmation', e.target.value)}
                            placeholder={isEditing ? "********" : "Confirm password"}
                            required={!isEditing || !!formData.password}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            tabIndex="-1"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="can_access_multiple_warehouses"
                    checked={!!formData.can_access_multiple_warehouses}
                    onCheckedChange={(checked) => handleChange('can_access_multiple_warehouses', checked)}
                />
                <Label htmlFor="can_access_multiple_warehouses">Can access multiple warehouses</Label>
            </div>
        </div>
    )
}
