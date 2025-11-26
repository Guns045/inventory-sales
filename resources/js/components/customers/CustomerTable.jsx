import * as React from "react"
import { DataTable } from "@/components/common/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react"

/**
 * CustomerTable component for displaying customers
 * @param {Array} data - Customers data
 * @param {boolean} loading - Loading state
 * @param {Function} onEdit - Edit handler
 * @param {Function} onDelete - Delete handler
 */
export function CustomerTable({ data, loading, onEdit, onDelete }) {
    const columns = [
        {
            header: "Company",
            accessorKey: "company_name",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.company_name}</div>
                    {row.contact_person && (
                        <div className="text-xs text-gray-500 mt-1">
                            Contact: {row.contact_person}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Email",
            accessorKey: "email",
            cell: (row) => row.email ? (
                <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
                        {row.email}
                    </a>
                </div>
            ) : (
                <span className="text-gray-400 text-sm">-</span>
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
            ) : (
                <span className="text-gray-400 text-sm">-</span>
            )
        },
        {
            header: "Address",
            accessorKey: "address",
            cell: (row) => row.address ? (
                <div className="flex items-start gap-2 text-sm max-w-xs">
                    <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 line-clamp-2">{row.address}</span>
                </div>
            ) : (
                <span className="text-gray-400 text-sm">-</span>
            )
        },
        {
            header: "Tax ID",
            accessorKey: "tax_id",
            cell: (row) => row.tax_id ? (
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {row.tax_id}
                </code>
            ) : (
                <span className="text-gray-400 text-sm">-</span>
            )
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
                variant="destructive"
                size="sm"
                onClick={() => onDelete(row)}
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
            emptyMessage="No customers found"
        />
    )
}
