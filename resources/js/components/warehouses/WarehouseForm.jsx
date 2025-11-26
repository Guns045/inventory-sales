import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function WarehouseForm({ formData, onChange, onSubmit, isEditing = false }) {
    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value })
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter warehouse name"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Textarea
                    id="location"
                    value={formData.location || ''}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Enter warehouse location/address"
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="code">Warehouse Code</Label>
                <Input
                    id="code"
                    value={formData.code || ''}
                    onChange={(e) => handleChange('code', e.target.value)}
                    placeholder="e.g., WH-01"
                />
            </div>
        </form>
    )
}
