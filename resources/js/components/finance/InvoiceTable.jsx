import React from 'react';
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    CreditCard,
    AlertTriangle,
    RefreshCw,
    History,
    Printer
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InvoiceTable({
    data,
    loading,
    onView,
    onAddPayment,
    onMarkOverdue,
    onUpdateStatus,
    onViewHistory,
    onPrint
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

    const isOverdue = (invoice) => {
        if (!invoice.due_date || invoice.status === 'PAID' || invoice.status === 'OVERDUE' || invoice.status === 'CANCELLED') {
            return false;
        }
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    };

    const isNearDue = (invoice) => {
        if (!invoice.due_date || invoice.status === 'PAID' || invoice.status === 'OVERDUE' || invoice.status === 'CANCELLED') {
            return false;
        }
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Alert if due within 3 days (inclusive of today)
        return diffDays >= 0 && diffDays <= 3;
    };

    const getStatusVariant = (status) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return 'success';
            case 'UNPAID': return 'warning';
            case 'PARTIAL': return 'info';
            case 'OVERDUE': return 'destructive';
            case 'CANCELLED': return 'secondary';
            default: return 'default';
        }
    };

    const columns = [
        {
            header: "Invoice Number",
            accessorKey: "invoice_number",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.invoice_number}</div>
                    {row.sales_order_number && (
                        <div className="text-xs text-muted-foreground">
                            SO: {row.sales_order_number}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "PO Customer",
            accessorKey: "po_number",
            cell: (row) => (
                <div className="font-medium">
                    {row.po_number || '-'}
                </div>
            )
        },
        {
            header: "Customer",
            accessorKey: "customer_name",
            cell: (row) => (
                <div className="font-medium">
                    {row.customer?.company_name || row.customer?.name || '-'}
                </div>
            )
        },
        {
            header: "Issue Date",
            accessorKey: "issue_date",
            cell: (row) => formatDate(row.issue_date)
        },
        {
            header: "Due Date",
            accessorKey: "due_date",
            cell: (row) => (
                <span className={isOverdue(row) ? "text-red-600 font-medium" : ""}>
                    {formatDate(row.due_date)}
                </span>
            )
        },
        {
            header: "Total Amount",
            accessorKey: "total_amount",
            cell: (row) => (
                <div className="font-bold text-blue-600">
                    {formatCurrency(row.total_amount)}
                </div>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Badge
                        variant={getStatusVariant(row.status)}
                        className={row.status === 'CANCELLED' ? "bg-red-100 text-red-600 hover:bg-red-200 border-0" : ""}
                    >
                        {row.status}
                    </Badge>
                    {isOverdue(row) && row.status !== 'OVERDUE' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" title="Overdue" />
                    )}
                    {isNearDue(row) && (
                        <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" title="Due Soon: Please Bill Immediately" />
                    )}
                </div>
            )
        },
    ];

    const renderActions = (row) => (
        <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => onView(row)} title="View Details">
                <Eye className="h-4 w-4" />
            </Button>

            {(row.status === 'UNPAID' || row.status === 'PARTIAL') && (
                <>
                    <Button variant="ghost" size="icon" onClick={() => onAddPayment(row)} title="Add Payment">
                        <CreditCard className="h-4 w-4 text-green-600" />
                    </Button>
                    {isOverdue(row) && (
                        <Button variant="ghost" size="icon" onClick={() => onMarkOverdue(row)} title="Mark as Overdue">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </Button>
                    )}
                </>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onUpdateStatus(row, 'UNPAID')}>Set Unpaid</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(row, 'PAID')}>Set Paid</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(row, 'PARTIAL')}>Set Partial</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(row, 'OVERDUE')}>Set Overdue</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(row, 'CANCELLED')}>Set Cancelled</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={() => onViewHistory(row)} title="Payment History">
                <History className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => onPrint(row)} title="Print">
                <Printer className="h-4 w-4" />
            </Button>
        </div>
    );

    return (
        <DataTable
            columns={columns}
            data={data}
            loading={loading}
            actions={renderActions}
            emptyMessage="No invoices found"
        />
    );
}
