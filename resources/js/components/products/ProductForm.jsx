import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

/**
 * ProductForm component for creating/editing products
 * @param {object} formData - Form data
 * @param {Function} onChange - Change handler
 * @param {Function} onSubmit - Submit handler
 * @param {Array} categories - Categories list
 * @param {Array} suppliers - Suppliers list
 * @param {boolean} isEditing - Edit mode flag
 */
export function ProductForm({
    formData,
    onChange,
    onSubmit,
    categories = [],
    suppliers = [],
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
                    <Label htmlFor="sku">SKU / Part Number *</Label>
                    <Input
                        id="sku"
                        value={formData.sku || ''}
                        onChange={(e) => handleChange('sku', e.target.value)}
                        placeholder="Enter SKU"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Enter product name"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                        value={formData.category_id?.toString() || ''}
                        onValueChange={(value) => handleChange('category_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select
                        value={formData.supplier_id?.toString() || ''}
                        onValueChange={(value) => handleChange('supplier_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                    {supplier.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="buy_price">Buy Price *</Label>
                    <Input
                        id="buy_price"
                        type="number"
                        value={formData.buy_price || ''}
                        onChange={(e) => handleChange('buy_price', e.target.value)}
                        placeholder="0"
                        required
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sell_price">Sell Price *</Label>
                    <Input
                        id="sell_price"
                        type="number"
                        value={formData.sell_price || ''}
                        onChange={(e) => handleChange('sell_price', e.target.value)}
                        placeholder="0"
                        required
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="min_stock_level">Min Stock Level *</Label>
                    <Input
                        id="min_stock_level"
                        type="number"
                        value={formData.min_stock_level || ''}
                        onChange={(e) => handleChange('min_stock_level', e.target.value)}
                        placeholder="0"
                        required
                        min="0"
                    />
                </div>
            </div>
        </form>
    )
}
