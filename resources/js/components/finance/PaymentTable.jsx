import React from 'react';
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export function PaymentTable({
    data,
    loading,
    onView,
    onEdit
}) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const columns = [
        {
            header: "Invoice Number",
            accessorKey: "invoice.invoice_number",
            cell: (row) => (
                <div className="font-medium">{row.invoice?.invoice_number || '-'}</div>
            )
        },
        {
            header: "Customer",
            accessorKey: "invoice.customer.company_name",
            cell: (row) => (
                <div>
                    {row.invoice?.customer?.company_name || row.invoice?.customer?.name || '-'}
                </div>
            )
        },
        {
            header: "Amount Paid",
            accessorKey: "amount_paid",
            cell: (row) => (
                <div className="font-bold text-green-600">
                    {formatCurrency(row.amount_paid)}
                </div>
            )
        },
        {
            header: "Payment Date",
            accessorKey: "payment_date",
            cell: (row) => formatDate(row.payment_date)
        },
        {
            header: "Method",
            accessorKey: "payment_method",
            cell: (row) => (
                <Badge variant="outline">
                    {row.payment_method}
                </Badge>
            )
        },
        {
            header: "Reference",
            accessorKey: "reference_number",
            cell: (row) => (
                <span className="text-sm text-gray-500">
                    {row.reference_number || '-'}
                </span>
            )
        }
    ];

    const renderActions = (row) => (
        <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => onView(row)} title="View Details">
                <Eye className="h-4 w-4" />
            </Button>
        </div>
    );

    return (
        <DataTable
            columns={columns}
            data={data}
            loading={loading}
            actions={renderActions}
            emptyMessage="No payments found"
        />
    );
}
