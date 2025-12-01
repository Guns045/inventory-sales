import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    CheckCircle,
    Trash2,
    MoreHorizontal
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GoodsReceiptTable({
    data,
    loading,
    onView,
    onReceive,
    onDelete,
    canReceive,
    canDelete
}) {
    const getStatusBadge = (status) => {
        const styles = {
            'PENDING': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
            'RECEIVED': 'bg-green-100 text-green-800 hover:bg-green-200',
            'REJECTED': 'bg-red-100 text-red-800 hover:bg-red-200'
        };
        return (
            <Badge className={`${styles[status] || 'bg-gray-100 text-gray-800'} border-0`}>
                {status}
            </Badge>
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const columns = [
        {
            header: "GR Number",
            accessorKey: "receipt_number",
            cell: (row) => <span className="font-mono font-medium">{row.receipt_number}</span>
        },
        {
            header: "PO Number",
            accessorKey: "purchase_order.po_number",
            cell: (row) => <span className="font-mono">{row.purchase_order?.po_number || 'N/A'}</span>
        },
        {
            header: "Supplier",
            accessorKey: "purchase_order.supplier_name",
            cell: (row) => row.purchase_order?.supplier_name || 'N/A'
        },
        {
            header: "Warehouse",
            accessorKey: "warehouse_name",
            cell: (row) => row.warehouse_name || 'N/A'
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => getStatusBadge(row.status)
        },
        {
            header: "Received Date",
            accessorKey: "receipt_date",
            cell: (row) => row.receipt_date ? new Date(row.receipt_date).toLocaleDateString() : '-'
        },
        {
            header: "Total Amount",
            accessorKey: "total_amount",
            cell: (row) => <span className="text-right block">{formatCurrency(row.total_amount)}</span>
        }
    ];

    const renderActions = (row) => {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onView(row)}>
                        <Eye className="mr-2 h-4 w-4" /> View Items
                    </DropdownMenuItem>

                    {canReceive(row) && (
                        <DropdownMenuItem onClick={() => onReceive(row.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Receive Goods
                        </DropdownMenuItem>
                    )}

                    {canDelete(row) && (
                        <DropdownMenuItem onClick={() => onDelete(row.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <DataTable
            columns={columns}
            data={data}
            loading={loading}
            actions={renderActions}
            emptyMessage="No goods receipts found"
            emptyDescription="Create a new goods receipt to get started"
        />
    );
}
