import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    Truck,
    Printer,
    Package,
    ClipboardCheck,
    Box
} from 'lucide-react';

export function DeliveryOrderTable({
    data,
    loading,
    onView,
    onUpdateStatus,
    onPrint,
    onCreatePickingList,
    onPrintPickingList,
    type = 'sales' // 'sales' or 'transfer'
}) {
    const getStatusBadge = (status) => {
        const styles = {
            'PREPARING': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
            'READY_TO_SHIP': 'bg-green-100 text-green-800 hover:bg-green-200',
            'SHIPPED': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
            'DELIVERED': 'bg-green-600 text-white hover:bg-green-700',
            'CANCELLED': 'bg-red-100 text-red-800 hover:bg-red-200',
            'PROCESSING': 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        };
        return (
            <Badge className={`${styles[status] || 'bg-gray-100 text-gray-800'} border-0`}>
                {status?.replace(/_/g, ' ')}
            </Badge>
        );
    };

    const columns = [
        {
            header: "DO Number",
            accessorKey: "delivery_order_number",
            cell: (row) => <span className="font-mono font-medium">{row.delivery_order_number}</span>
        },
        {
            header: type === 'sales' ? "Sales Order" : "Internal Transfer",
            accessorKey: "sales_order.sales_order_number",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                        {type === 'sales'
                            ? row.sales_order?.sales_order_number || '-'
                            : row.warehouse_transfer?.transfer_number || row.source_ref || '-'}
                    </span>
                </div>
            )
        },
        {
            header: type === 'sales' ? "Customer" : "Destination",
            accessorKey: "customer.name",
            cell: (row) => (
                <div>
                    <div className="font-medium">
                        {type === 'sales'
                            ? (row.customer?.name || row.customer?.company_name || 'N/A')
                            : (row.warehouse_transfer?.warehouseTo?.name || row.destination_warehouse?.name || 'N/A')}
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => getStatusBadge(row.status)
        },
        {
            header: "Date",
            accessorKey: "created_at",
            cell: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'
        }
    ];

    const renderActions = (row) => {
        return (
            <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => onView(row)} title="View Details">
                    <Eye className="h-4 w-4 text-gray-500" />
                </Button>

                {row.status === 'PREPARING' && (
                    <>
                        {row.picking_list_id ? (
                            <Button variant="ghost" size="icon" onClick={() => onPrintPickingList(row)} title="Print Picking List">
                                <Printer className="h-4 w-4 text-blue-500" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" onClick={() => onCreatePickingList(row)} title="Create Picking List">
                                <ClipboardCheck className="h-4 w-4 text-blue-500" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => onUpdateStatus(row, 'READY_TO_SHIP')} title="Mark Ready to Ship">
                            <Package className="h-4 w-4 text-green-500" />
                        </Button>
                    </>
                )}

                {row.status === 'READY_TO_SHIP' && (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => onPrint(row)} title="Print DO">
                            <Printer className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onUpdateStatus(row, 'SHIPPED')} title="Ship Order">
                            <Truck className="h-4 w-4 text-orange-500" />
                        </Button>
                    </>
                )}

                {row.status === 'SHIPPED' && (
                    <Button variant="ghost" size="icon" onClick={() => onUpdateStatus(row, 'DELIVERED')} title="Mark Delivered">
                        <Box className="h-4 w-4 text-green-600" />
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
            emptyMessage={`No ${type === 'sales' ? 'sales' : 'transfer'} delivery orders found`}
            emptyDescription="Delivery orders will appear here once created"
        />
    );
}
