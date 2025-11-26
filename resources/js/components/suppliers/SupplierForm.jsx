import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function SupplierForm({ formData, onChange, onSubmit, isEditing = false }) {
    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value })
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter supplier name"
                    required
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                        id="contact_person"
                        value={formData.contact_person || ''}
                        onChange={(e) => handleChange('contact_person', e.target.value)}
                        placeholder="Enter contact person"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        value={formData.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+62 xxx xxxx xxxx"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Enter supplier address"
                    rows={3}
                />
            </div>
        </form>
    )
}
