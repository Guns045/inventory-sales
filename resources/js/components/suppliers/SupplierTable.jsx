import * as React from "react"
import { DataTable } from "@/components/common/DataTable"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Phone, MapPin, User } from "lucide-react"

export function SupplierTable({ data, loading, onEdit, onDelete }) {
    const columns = [
        {
            header: "Supplier",
            accessorKey: "name",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.name}</div>
                    {row.contact_person && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <User className="h-3 w-3" />
                            {row.contact_person}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Phone",
            accessorKey: "phone",
            cell: (row) => row.phone ? (
                <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <a href={`tel:${row.phone}`} className="text-gray-700">
                        {row.phone}
                    </a>
                </div>
            ) : <span className="text-gray-400 text-sm">-</span>
        },
        {
            header: "Address",
            accessorKey: "address",
            cell: (row) => row.address ? (
                <div className="flex items-start gap-2 text-sm max-w-md">
                    <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 line-clamp-2">{row.address}</span>
                </div>
            ) : <span className="text-gray-400 text-sm">-</span>
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
            emptyMessage="No suppliers found"
        />
    )
}
