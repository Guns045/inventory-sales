import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    Pencil,
    Trash2,
    Send,
    Printer,
    MoreHorizontal,
    CreditCard
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PurchaseOrderTable({
    data,
    loading,
    onEdit,
    onDelete,
    onViewItems,
    onPrint,
    onSend,
    onPay,
    canEdit,
    canDelete,
    canSend
}) {
    const getStatusBadge = (status) => {
        const styles = {
            'DRAFT': 'bg-gray-100 text-gray-800 hover:bg-gray-200',
            'SENT': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
            'CONFIRMED': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
            'PARTIAL_RECEIVED': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
            'COMPLETED': 'bg-green-100 text-green-800 hover:bg-green-200',
            'CANCELLED': 'bg-red-100 text-red-800 hover:bg-red-200'
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
            header: "PO Number",
            accessorKey: "po_number",
            cell: (row) => <span className="font-mono font-medium">{row.po_number}</span>
        },
        {
            header: "Supplier",
            accessorKey: "supplier.name",
            cell: (row) => row.supplier?.name || 'N/A'
        },
        {
            header: "Warehouse",
            accessorKey: "warehouse.name",
            cell: (row) => row.warehouse?.name || 'N/A'
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => getStatusBadge(row.status)
        },
        {
            header: "Payment",
            accessorKey: "payment_status",
            cell: (row) => {
                const colors = {
                    'PAID': 'bg-green-100 text-green-800',
                    'PARTIAL': 'bg-yellow-100 text-yellow-800',
                    'UNPAID': 'bg-red-100 text-red-800'
                };
                return (
                    <Badge className={`${colors[row.payment_status] || 'bg-gray-100'} border-0`}>
                        {row.payment_status || 'UNPAID'}
                    </Badge>
                );
            }
        },
        {
            header: "Expected Date",
            accessorKey: "expected_delivery_date",
            cell: (row) => row.expected_delivery_date ? new Date(row.expected_delivery_date).toLocaleDateString() : '-'
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
                    <DropdownMenuItem onClick={() => onViewItems(row)}>
                        <Eye className="mr-2 h-4 w-4" /> View Items
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrint(row.id)}>
                        <Printer className="mr-2 h-4 w-4" /> Print PDF
                    </DropdownMenuItem>

                    {canSend(row) && (
                        <DropdownMenuItem onClick={() => onSend(row)}>
                            <Send className="mr-2 h-4 w-4" /> Send to Supplier
                        </DropdownMenuItem>
                    )}

                    {(canEdit(row) || canDelete(row)) && <DropdownMenuSeparator />}

                    {canEdit(row) && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                    )}

                    {canDelete(row) && (
                        <DropdownMenuItem onClick={() => onDelete(row.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    )}

                    {row.status !== 'DRAFT' && row.status !== 'CANCELLED' && row.payment_status !== 'PAID' && (
                        <DropdownMenuItem onClick={() => onPay(row)} className="text-green-600">
                            <CreditCard className="mr-2 h-4 w-4" /> Pay
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
            emptyMessage="No purchase orders found"
            emptyDescription="Create a new purchase order to get started"
        />
    );
}
