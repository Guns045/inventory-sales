import * as React from "react"
import { DataTable } from "@/components/common/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"

/**
 * ProductTable component for displaying products
 * @param {Array} data - Products data
 * @param {boolean} loading - Loading state
 * @param {Function} onEdit - Edit handler
 * @param {Function} onDelete - Delete handler
 */
export function ProductTable({ data, loading, onEdit, onDelete }) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value)
    }

    const columns = [
        {
            header: "Part Number",
            accessorKey: "sku",
            cell: (row) => (
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {row.sku}
                </code>
            )
        },
        {
            header: "Description",
            accessorKey: "name",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.name}</div>
                    {row.description && (
                        <div className="text-xs text-gray-500 mt-1">
                            {row.description}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Total Stock",
            accessorKey: "total_stock",
            cell: (row) => (
                <div className="text-center font-semibold">
                    {row.total_stock}
                </div>
            )
        },
        {
            header: "Available",
            accessorKey: "current_stock",
            cell: (row) => {
                const isLowStock = row.current_stock <= row.min_stock_level
                return (
                    <div className={`text-center font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                        {row.current_stock}
                    </div>
                )
            }
        },
        {
            header: "Reserved",
            accessorKey: "reserved_stock",
            cell: (row) => (
                <div className="text-center text-yellow-600 font-medium">
                    {row.reserved_stock}
                </div>
            )
        },
        {
            header: "Category",
            accessorKey: "category",
            cell: (row) => (
                <Badge variant="outline">{row.category}</Badge>
            )
        },
        {
            header: "Supplier",
            accessorKey: "supplier",
            cell: (row) => (
                <span className="text-sm text-gray-600">{row.supplier}</span>
            )
        },
        {
            header: "Buy Price",
            accessorKey: "buy_price",
            cell: (row) => (
                <span className="text-sm text-gray-600">
                    {formatCurrency(row.buy_price)}
                </span>
            )
        },
        {
            header: "Sell Price",
            accessorKey: "sell_price",
            cell: (row) => (
                <span className="text-sm font-semibold text-blue-600">
                    {formatCurrency(row.sell_price)}
                </span>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => {
                const inStock = row.current_stock > 0
                return (
                    <Badge
                        variant={inStock ? "success" : "outline"}
                        className={!inStock ? "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20" : ""}
                    >
                        {inStock ? "In Stock" : "Out of Stock"}
                    </Badge>
                )
            }
        }
    ]

    const actions = (row) => (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(row)}
            >
                <Pencil className="h-3 w-3" />
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(row)}
                className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20 hover:text-red-700"
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        </>
    )

    return (
        <DataTable
            columns={columns}
            data={data}
            loading={loading}
            actions={actions}
            emptyMessage="No products found"
        />
    )
}
