import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

/**
 * Generic DataTable component with sorting, filtering, and actions
 * @param {Array} columns - Column definitions
 * @param {Array} data - Table data
 * @param {Function} onRowClick - Row click handler
 * @param {boolean} loading - Loading state
 * @param {string} emptyMessage - Message when no data
 */
export function DataTable({
    columns = [],
    data = [],
    onRowClick,
    loading = false,
    emptyMessage = "No data available",
    actions
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <p className="text-lg font-medium">{emptyMessage}</p>
                <p className="text-sm">Try adjusting your search or filters</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {columns.map((column, index) => (
                        <TableHead
                            key={column.accessorKey || index}
                            className={column.headerClassName}
                        >
                            {column.header}
                        </TableHead>
                    ))}
                    {actions && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row, rowIndex) => (
                    <TableRow
                        key={row.id || rowIndex}
                        onClick={() => onRowClick && onRowClick(row)}
                        className={onRowClick ? "cursor-pointer" : ""}
                    >
                        {columns.map((column, colIndex) => (
                            <TableCell
                                key={column.accessorKey || colIndex}
                                className={column.cellClassName}
                            >
                                {column.cell
                                    ? column.cell(row)
                                    : row[column.accessorKey]
                                }
                            </TableCell>
                        ))}
                        {actions && (
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {actions(row)}
                                </div>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
