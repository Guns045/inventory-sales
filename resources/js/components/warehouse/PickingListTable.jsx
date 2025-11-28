import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    Printer,
    CheckCircle,
    PlusCircle,
    Edit
} from 'lucide-react';

export function PickingListTable({
    data,
    loading,
    type = 'all', // 'pending', 'sales', 'transfer', 'all'
    onView,
    onPrint,
    onCreate,
    onEdit
}) {
    const getStatusBadge = (status) => {
        const styles = {
            'DRAFT': 'bg-gray-100 text-gray-800',
            'PENDING': 'bg-yellow-100 text-yellow-800',
            'READY': 'bg-blue-100 text-blue-800',
            'PICKING': 'bg-orange-100 text-orange-800',
            'COMPLETED': 'bg-green-100 text-green-800',
            'CANCELLED': 'bg-red-100 text-red-800'
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
        // Columns for Pending Orders
        ...(type === 'pending' ? [
            {
                header: "SO Number",
                accessorKey: "sales_order_number",
                cell: (row) => <span className="font-mono font-medium">{row.sales_order_number}</span>
            },
            {
                header: "Customer",
                accessorKey: "customer.name",
                cell: (row) => row.customer?.company_name || row.customer?.name || '-'
            },
            {
                header: "Amount",
                accessorKey: "total_amount",
                cell: (row) => <span className="text-primary font-medium">{formatCurrency(row.total_amount)}</span>
            },
            {
                header: "Date",
                accessorKey: "created_at",
                cell: (row) => new Date(row.created_at).toLocaleDateString()
            },
            {
                header: "Status",
                accessorKey: "status",
                cell: (row) => getStatusBadge('PENDING')
            }
        ] : []),

        // Columns for Picking Lists (Sales, Transfer, All)
        ...(type !== 'pending' ? [
            {
                header: "Picking Number",
                accessorKey: "picking_list_number",
                cell: (row) => (
                    <div>
                        <div className="font-mono font-medium">{row.picking_list_number}</div>
                        {type === 'transfer' && (
                            <Badge variant="outline" className="mt-1 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                Internal Transfer
                            </Badge>
                        )}
                    </div>
                )
            },
            {
                header: type === 'transfer' ? "Transfer Ref" : "Sales Order",
                accessorKey: "reference_number",
                cell: (row) => {
                    if (type === 'transfer') {
                        return row.notes ? row.notes.replace('For warehouse transfer: ', '') : '-';
                    }
                    return row.sales_order?.sales_order_number || '-';
                }
            },
            {
                header: type === 'transfer' ? "Product Info" : "Customer",
                accessorKey: "info",
                cell: (row) => {
                    if (type === 'transfer') {
                        const item = row.items?.[0];
                        return item ? (
                            <div className="text-sm">
                                <div className="font-medium">{item.product?.name}</div>
                                <div className="text-muted-foreground">Qty: {item.quantity_required}</div>
                            </div>
                        ) : '-';
                    }
                    return row.sales_order?.customer?.company_name || row.sales_order?.customer?.name || '-';
                }
            },
            {
                header: "Status",
                accessorKey: "status",
                cell: (row) => getStatusBadge(row.status)
            },
            {
                header: "Date",
                accessorKey: "created_at",
                cell: (row) => new Date(row.created_at).toLocaleDateString()
            }
        ] : [])
    ];

    const renderActions = (row) => {
        if (type === 'pending') {
            return (
                <Button size="sm" onClick={() => onCreate(row.id)} className="bg-green-600 hover:bg-green-700 text-white">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Picking List
                </Button>
            );
        }

        return (
            <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => onView(row)} title="View Details">
                    <Eye className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onPrint(row.id)} title="Print">
                    <Printer className="h-4 w-4 text-gray-500" />
                </Button>
                {row.status === 'DRAFT' && onEdit && (
                    <Button variant="ghost" size="icon" onClick={() => onEdit(row)} title="Edit">
                        <Edit className="h-4 w-4 text-yellow-500" />
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
            actions={renderActions}
            emptyMessage={type === 'pending' ? "No pending orders found" : "No picking lists found"}
            emptyDescription={type === 'pending' ? "All orders have picking lists" : "Create a new picking list to get started"}
        />
    );
}
