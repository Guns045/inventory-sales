import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import {
    Eye,
    PlayCircle,
    Truck,
    Trash2,
    Printer
} from 'lucide-react';

export function SalesOrderTable({
    data,
    loading,
    onView,
    onUpdateStatus,
    onDelete,
    onPrint
}) {
    const { user } = useAuth();

    const getAvailableActions = (order) => {
        const userRole = user?.role?.name || user?.role || '';
        const isSalesTeam = userRole.toLowerCase().includes('sales');
        const isAdmin = userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('manager');
        const isSuperAdmin = userRole === 'Super Admin';

        const actions = {
            canView: true,
            canPrint: true,
            canProcess: false,
            canShip: false,
            canDelete: false
        };

        // Sales Team: View & Print only
        if (isSalesTeam) {
            return actions;
        }

        // Admin/Super Admin
        if (isAdmin || isSuperAdmin) {
            if (order.status === 'PENDING') {
                actions.canProcess = true;
                actions.canDelete = true;
            }
            if (order.status === 'PROCESSING') {
                // actions.canShip = true; // Removed: Processing orders are handled in Delivery Order page
            }
            // Super Admin can delete anytime? Original code said "disabled={order.status !== 'PENDING'}" for delete
            // So sticking to PENDING only for delete for now.
        }

        return actions;
    };

    const columns = [
        {
            header: "SO Number",
            accessorKey: "sales_order_number",
            cell: (row) => (
                <div>
                    <div className="font-mono text-sm font-medium">{row.sales_order_number}</div>
                    {row.quotation && (
                        <div className="text-xs text-muted-foreground">
                            From: {row.quotation.quotation_number}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Customer",
            accessorKey: "customer.company_name",
            cell: (row) => (
                <div className="font-medium">{row.customer?.company_name || 'N/A'}</div>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => (
                <StatusBadge status={row.status} config={{
                    'PENDING': { variant: 'warning', label: 'Pending' },
                    'PROCESSING': { variant: 'info', label: 'Processing' },
                    'READY_TO_SHIP': { variant: 'primary', label: 'Ready to Ship' },
                    'SHIPPED': { variant: 'success', label: 'Shipped' },
                    'COMPLETED': { variant: 'success', label: 'Completed' },
                    'CANCELLED': { variant: 'destructive', label: 'Cancelled' }
                }} />
            )
        },
        {
            header: "Date",
            accessorKey: "created_at",
            cell: (row) => new Date(row.created_at).toLocaleDateString()
        },
        {
            header: "Total Amount",
            accessorKey: "total_amount",
            cell: (row) => (
                <span className="font-medium text-blue-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.total_amount)}
                </span>
            )
        },
        {
            header: "Created By",
            accessorKey: "user.name",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {row.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium">{row.user?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">{row.user?.role?.name || ''}</span>
                    </div>
                </div>
            )
        }
    ];

    const renderActions = (row) => {
        const actions = getAvailableActions(row);
        return (
            <div className="flex gap-1 justify-end">
                {actions.canView && (
                    <Button variant="ghost" size="icon" onClick={() => onView(row)} title="View Details">
                        <Eye className="h-4 w-4 text-blue-500" />
                    </Button>
                )}
                {actions.canPrint && (
                    <Button variant="ghost" size="icon" onClick={() => onPrint(row)} title="Print Quotation">
                        <Printer className="h-4 w-4 text-gray-500" />
                    </Button>
                )}
                {actions.canProcess && (
                    <Button variant="ghost" size="icon" onClick={() => onUpdateStatus(row, 'PROCESSING')} title="Start Processing">
                        <PlayCircle className="h-4 w-4 text-green-500" />
                    </Button>
                )}
                {actions.canShip && (
                    <Button variant="ghost" size="icon" onClick={() => onUpdateStatus(row, 'READY_TO_SHIP')} title="Ready to Ship">
                        <Truck className="h-4 w-4 text-blue-600" />
                    </Button>
                )}
                {actions.canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(row)} title="Delete">
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
            actions={renderActions}
            emptyMessage="No sales orders found"
        />
    );
}
