import * as React from "react"
import { DataTable } from "@/components/common/DataTable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Warehouse, MapPin } from "lucide-react"

export function WarehouseTable({ data, loading, onEdit, onDelete }) {
    const columns = [
        {
            header: "Warehouse",
            accessorKey: "name",
            cell: (row) => (
                <div>
                    <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{row.name}</span>
                    </div>
                    {row.code && (
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                            {row.code}
                        </code>
                    )}
                </div>
            )
        },
        {
            header: "Location",
            accessorKey: "location",
            cell: (row) => row.location ? (
                <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 line-clamp-2">{row.location}</span>
                </div>
            ) : (
                <span className="text-gray-400 text-sm">-</span>
            )
        },
        {
            header: "Stock Items",
            accessorKey: "stock_count",
            cell: (row) => (
                <Badge variant="outline">
                    {row.stock_count || 0} items
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
            emptyMessage="No warehouses found"
        />
    )
}
