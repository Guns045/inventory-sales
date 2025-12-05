import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Pencil,
    Eye,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Trash2
} from 'lucide-react';

export function ProductStockTable({
    data,
    loading,
    onAdjust,
    onViewHistory,
    onDelete,
    userRole,
    canUpdate = false,
    canDelete = false,
    warehouses = [],
    viewMode = 'per-warehouse',
    selectedIds = [],
    onSelectionChange = () => { }
}) {
    const getStockStatus = (stock) => {
        const available = stock.quantity - stock.reserved_quantity;
        const minStock = stock.min_stock_level || 0;

        if (available <= 0) return { variant: 'destructive', label: 'Out of Stock', icon: XCircle };
        if (available <= minStock) return { variant: 'warning', label: 'Low Stock', icon: AlertTriangle };
        return { variant: 'success', label: 'In Stock', icon: CheckCircle };
    };

    const isAllWarehousesView = viewMode === 'all-warehouses';

    // Handle "Select All"
    const handleSelectAll = (checked) => {
        if (checked) {
            const allIds = data.map(item => item.id);
            onSelectionChange(allIds);
        } else {
            onSelectionChange([]);
        }
    };

    // Handle individual selection
    const handleSelectRow = (id, checked) => {
        if (checked) {
            onSelectionChange([...selectedIds, id]);
        } else {
            onSelectionChange(selectedIds.filter(itemId => itemId !== id));
        }
    };

    let columns = [];

    // Add checkbox column if not in pivot view
    if (!isAllWarehousesView) {
        columns.push({
            id: "select",
            header: () => (
                <Checkbox
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                />
            ),
            cell: (row) => (
                <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={(checked) => handleSelectRow(row.id, checked)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        });
    }

    columns.push(
        {
            header: "Part Number",
            accessorKey: "product.sku",
            cell: (row) => <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">{row.product?.sku || 'N/A'}</code>
        },
        {
            header: "Description",
            accessorKey: "product.name",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.product?.description || row.product?.name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{row.product?.category || 'No Category'}</div>
                </div>
            )
        }
    );

    if (isAllWarehousesView && warehouses) {
        // Add columns for each warehouse
        warehouses.forEach(warehouse => {
            // Reserved Column
            columns.push({
                header: `${warehouse.code} Res`,
                id: `warehouse_${warehouse.id}_res`,
                headerClassName: "text-center",
                cellClassName: "text-center",
                cell: (row) => {
                    const stock = row.stocks?.find(s => s.warehouse_id === warehouse.id);
                    return stock && stock.reserved_quantity > 0 ? (
                        <span className="text-orange-600 font-medium">{stock.reserved_quantity}</span>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    );
                }
            });

            // Available Column
            columns.push({
                header: `${warehouse.code} Avail`,
                id: `warehouse_${warehouse.id}_avail`,
                headerClassName: "text-center",
                cellClassName: "text-center",
                cell: (row) => {
                    const stock = row.stocks?.find(s => s.warehouse_id === warehouse.id);
                    if (!stock) return <span className="text-muted-foreground">-</span>;

                    const available = stock.quantity - stock.reserved_quantity;
                    return (
                        <span className={`font-medium ${available > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {available}
                        </span>
                    );
                }
            });
        });

        // Add Total Stock column
        columns.push({
            header: "Total Stock",
            accessorKey: "quantity",
            headerClassName: "text-center",
            cellClassName: "text-center",
            cell: (row) => <span className="font-bold text-blue-600">{row.quantity}</span>
        });

    } else {
        // Standard columns
        columns.push(
            {
                header: "Total Stock",
                accessorKey: "quantity",
                cell: (row) => <span className="font-semibold text-blue-600">{row.quantity}</span>
            },
            {
                header: "Reserved",
                accessorKey: "reserved_quantity",
                cell: (row) => <span className="text-orange-500">{row.reserved_quantity}</span>
            },
            {
                header: "Available",
                accessorKey: "available_quantity",
                cell: (row) => {
                    const available = row.quantity - row.reserved_quantity;
                    return (
                        <span className={`font-bold ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {available}
                        </span>
                    );
                }
            },
            {
                header: "Bin Location",
                accessorKey: "bin_location",
                cell: (row) => <span className="text-sm text-gray-600">{row.bin_location || '-'}</span>
            },
            {
                header: "Warehouse",
                accessorKey: "warehouse.name",
                cell: (row) => (
                    <div>
                        <Badge variant="outline" className="mb-1">{row.warehouse?.code || 'N/A'}</Badge>
                        <div className="text-xs text-muted-foreground">{row.warehouse?.name || 'N/A'}</div>
                    </div>
                )
            }
        );
    }

    // Add Status and Actions columns (common)
    columns.push(
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => {
                const status = getStockStatus(row);
                const Icon = status.icon;
                return (
                    <Badge variant={status.variant} className="flex w-fit items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {status.label}
                    </Badge>
                );
            }
        }
    );

    const renderActions = (row) => {
        // Hide actions for aggregate rows (pivot table)
        if (viewMode === 'all-warehouses') return null;

        return (
            <div className="flex gap-1 justify-end">
                {canUpdate && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onAdjust(row)}
                        title="Adjust Stock"
                    >
                        <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewHistory(row)}
                    title="View History"
                >
                    <Eye className="h-4 w-4 text-gray-500" />
                </Button>
                {canDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(row)}
                        title="Delete Stock"
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                )}
            </div>
        );
    };

    return (
        <DataTable
            columns={columns}
            data={data}
            loading={loading}
            actions={viewMode === 'all-warehouses' ? null : renderActions}
            emptyMessage="No stock records found"
            emptyDescription="Try adjusting your search or filters"
        />
    );
}
