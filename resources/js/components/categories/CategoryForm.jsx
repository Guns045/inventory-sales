import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function CategoryForm({ formData, onChange, onSubmit, isEditing = false }) {
    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value })
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter category name"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter category description"
                    rows={3}
                />
            </div>
        </form>
    )
}
