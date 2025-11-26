import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"

/**
 * LineItemsTable component for managing transaction line items
 * @param {Array} items - Line items array
 * @param {Array} products - Available products
 * @param {Function} onAdd - Add item handler
 * @param {Function} onUpdate - Update item handler
 * @param {Function} onRemove - Remove item handler
 * @param {boolean} editable - Whether items can be edited
 */
export function LineItemsTable({
    items = [],
    products = [],
    onAdd,
    onUpdate,
    onRemove,
    editable = true
}) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value || 0)
    }

    const calculateItemTotal = (item) => {
        const subtotal = (item.quantity || 0) * (item.unit_price || 0)
        const discount = subtotal * ((item.discount_percentage || 0) / 100)
        const afterDiscount = subtotal - discount
        const tax = afterDiscount * ((item.tax_rate || 0) / 100)
        return afterDiscount + tax
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-24">Quantity</TableHead>
                        <TableHead className="w-32">Unit Price</TableHead>
                        <TableHead className="w-24">Discount %</TableHead>
                        <TableHead className="w-24">Tax %</TableHead>
                        <TableHead className="w-32 text-right">Total</TableHead>
                        {editable && <TableHead className="w-16"></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={editable ? 7 : 6} className="text-center text-gray-500 py-8">
                                No items added yet
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    {editable ? (
                                        <Select
                                            value={item.product_id?.toString()}
                                            onValueChange={(value) => onUpdate(index, { ...item, product_id: parseInt(value) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((product) => (
                                                    <SelectItem key={product.id} value={product.id.toString()}>
                                                        {product.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <span className="font-medium">{item.product?.name || 'N/A'}</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editable ? (
                                        <Input
                                            type="number"
                                            value={item.quantity || ''}
                                            onChange={(e) => onUpdate(index, { ...item, quantity: parseInt(e.target.value) || 0 })}
                                            min="1"
                                            className="w-20"
                                        />
                                    ) : (
                                        <span>{item.quantity}</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editable ? (
                                        <Input
                                            type="number"
                                            value={item.unit_price || ''}
                                            onChange={(e) => onUpdate(index, { ...item, unit_price: parseFloat(e.target.value) || 0 })}
                                            min="0"
                                            step="0.01"
                                            className="w-28"
                                        />
                                    ) : (
                                        <span>{formatCurrency(item.unit_price)}</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editable ? (
                                        <Input
                                            type="number"
                                            value={item.discount_percentage || 0}
                                            onChange={(e) => onUpdate(index, { ...item, discount_percentage: parseFloat(e.target.value) || 0 })}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            className="w-20"
                                        />
                                    ) : (
                                        <span>{item.discount_percentage || 0}%</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editable ? (
                                        <Input
                                            type="number"
                                            value={item.tax_rate || 0}
                                            onChange={(e) => onUpdate(index, { ...item, tax_rate: parseFloat(e.target.value) || 0 })}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            className="w-20"
                                        />
                                    ) : (
                                        <span>{item.tax_rate || 0}%</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {formatCurrency(calculateItemTotal(item))}
                                </TableCell>
                                {editable && (
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onRemove(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {editable && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                </Button>
            )}
        </div>
    )
}
