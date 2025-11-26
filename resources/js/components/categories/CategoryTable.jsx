import * as React from "react"
import { DataTable } from "@/components/common/DataTable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Tag } from "lucide-react"

export function CategoryTable({ data, loading, onEdit, onDelete }) {
    const columns = [
        {
            header: "Category",
            accessorKey: "name",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{row.name}</span>
                </div>
            )
        },
        {
            header: "Description",
            accessorKey: "description",
            cell: (row) => row.description ? (
                <span className="text-sm text-gray-600">{row.description}</span>
            ) : (
                <span className="text-gray-400 text-sm">-</span>
            )
        },
        {
            header: "Products",
            accessorKey: "products_count",
            cell: (row) => (
                <Badge variant="outline">
                    {row.products_count || 0} products
                </Badge>
            )
        }
    ]

    const actions = (row) => (
        <>
            <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
                <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(row)}>
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
            emptyMessage="No categories found"
        />
    )
}
