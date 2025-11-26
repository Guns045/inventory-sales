import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/**
 * CustomerForm component for creating/editing customers
 * @param {object} formData - Form data
 * @param {Function} onChange - Change handler
 * @param {Function} onSubmit - Submit handler
 * @param {boolean} isEditing - Edit mode flag
 */
export function CustomerForm({
    formData,
    onChange,
    onSubmit,
    isEditing = false
}) {
    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                        id="company_name"
                        value={formData.company_name || ''}
                        onChange={(e) => handleChange('company_name', e.target.value)}
                        placeholder="Enter company name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                        id="contact_person"
                        value={formData.contact_person || ''}
                        onChange={(e) => handleChange('contact_person', e.target.value)}
                        placeholder="Enter contact person"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="customer@example.com"
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
                    placeholder="Enter customer address"
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID / NPWP</Label>
                <Input
                    id="tax_id"
                    value={formData.tax_id || ''}
                    onChange={(e) => handleChange('tax_id', e.target.value)}
                    placeholder="Enter tax ID"
                />
            </div>
        </form>
    )
}
