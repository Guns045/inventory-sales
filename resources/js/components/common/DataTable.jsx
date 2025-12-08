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
import { Loader2, Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Generic DataTable component with sorting, filtering, and actions
 * @param {Array} columns - Column definitions
 * @param {Array} data - Table data
 * @param {Function} onRowClick - Row click handler
 * @param {boolean} loading - Loading state
 * @param {string} emptyMessage - Message when no data
 * @param {React.ComponentType} emptyIcon - Icon to display when empty
 * @param {string} emptyDescription - Description when no data
 */
export function DataTable({
    columns = [],
    data = [],
    onRowClick,
    loading = false,
    emptyMessage = "No data available",
    emptyDescription = "Try adjusting your search or filters",
    actions
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="rounded-md border overflow-hidden">
            <div className="overflow-auto max-h-[600px]">
                <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                        <TableRow className="hover:bg-transparent border-b border-gray-100">
                            {columns.map((column, index) => (
                                <TableHead
                                    key={column.accessorKey || index}
                                    className={cn("text-gray-900 font-semibold", column.headerClassName)}
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                            {actions && <TableHead className="text-right text-gray-900 font-semibold">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((row, rowIndex) => (
                                <TableRow
                                    key={row.id || rowIndex}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={cn(
                                        "border-b border-gray-50 hover:bg-gray-50/50",
                                        onRowClick ? "cursor-pointer" : ""
                                    )}
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
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="h-48 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <Inbox className="h-10 w-10 mb-3 text-gray-400" />
                                        <p className="text-lg font-medium text-gray-900">{emptyMessage}</p>
                                        <p className="text-sm">{emptyDescription}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
