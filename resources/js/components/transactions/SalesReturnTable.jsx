import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from "@/components/ui/button";
import { Eye } from 'lucide-react';

export function SalesReturnTable({
    data,
    loading,
    onView
}) {
    const columns = [
        {
            header: "Return Number",
            accessorKey: "return_number",
            cell: (row) => (
                <div className="font-mono text-sm font-medium">{row.return_number}</div>
            )
        },
        {
            header: "Sales Order",
            accessorKey: "sales_order.sales_order_number",
            cell: (row) => (
                <div className="text-sm">{row.sales_order?.sales_order_number || 'N/A'}</div>
            )
        },
        {
            header: "Customer",
            accessorKey: "sales_order.customer.company_name",
            cell: (row) => (
                <div className="font-medium">{row.sales_order?.customer?.company_name || 'N/A'}</div>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => (
                <StatusBadge status={row.status} config={{
                    'PENDING': { variant: 'warning', label: 'Pending' },
                    'APPROVED': { variant: 'success', label: 'Approved' },
                    'REJECTED': { variant: 'destructive', label: 'Rejected' },
                    'COMPLETED': { variant: 'success', label: 'Completed' }
                }} />
            )
        },
        {
            header: "Date",
            accessorKey: "created_at",
            cell: (row) => new Date(row.created_at).toLocaleDateString()
        },
        {
            header: "Created By",
            accessorKey: "created_by.name",
            cell: (row) => (
                <div className="text-sm">{row.created_by?.name || 'Unknown'}</div>
            )
        }
    ];

    const renderActions = (row) => {
        return (
            <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => onView(row)} title="View Details">
                    <Eye className="h-4 w-4 text-blue-500" />
                </Button>
            </div>
        );
    };

    return (
        <DataTable
            columns={columns}
            data={data}
            loading={loading}
            actions={renderActions}
            emptyMessage="No sales returns found"
        />
    );
}
