import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    CheckCircle,
    Truck,
    ArrowDownCircle,
    FileText,
    XCircle,
    ClipboardCheck
} from 'lucide-react';

export function InternalTransferTable({
    data,
    loading,
    onViewDetails,
    onApprove,
    onDeliver,
    onReceive,
    onCancel,
    onPrintDO,
    onCreatePickingList,
    user,
    canApprove,
    canDeliver,
    canReceive
}) {
    const getStatusBadge = (status) => {
        const styles = {
            'REQUESTED': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
            'APPROVED': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
            'IN_TRANSIT': 'bg-orange-100 text-orange-800 hover:bg-orange-200',
            'RECEIVED': 'bg-green-100 text-green-800 hover:bg-green-200',
            'CANCELLED': 'bg-red-100 text-red-800 hover:bg-red-200'
        };
        return (
            <Badge className={`${styles[status] || 'bg-gray-100 text-gray-800'} border-0`}>
                {status}
            </Badge>
        );
    };

    const columns = [
        {
            header: "Transfer Number",
            accessorKey: "transfer_number",
            cell: (row) => <span className="font-mono font-medium">{row.transfer_number}</span>
        },
        {
            header: "Product",
            accessorKey: "product.sku",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.product?.sku}</div>
                    <div className="text-xs text-muted-foreground">{row.product?.description}</div>
                </div>
            )
        },
        {
            header: "From",
            accessorKey: "warehouseFrom.name",
            cell: (row) => row.warehouseFrom?.name || '-'
        },
        {
            header: "To",
            accessorKey: "warehouseTo.name",
            cell: (row) => row.warehouseTo?.name || '-'
        },
        {
            header: "Qty",
            accessorKey: "quantity_requested",
            cell: (row) => (
                <div className="text-right">
                    <div>Req: {row.quantity_requested}</div>
                    {row.quantity_delivered > 0 && <div className="text-xs text-orange-600">Del: {row.quantity_delivered}</div>}
                    {row.quantity_received > 0 && <div className="text-xs text-green-600">Rec: {row.quantity_received}</div>}
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
            accessorKey: "requested_at",
            cell: (row) => row.requested_at ? new Date(row.requested_at).toLocaleDateString() : '-'
        }
    ];

    const renderActions = (row) => {
        return (
            <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => onViewDetails(row)} title="View Details">
                    <Eye className="h-4 w-4 text-gray-500" />
                </Button>

                {row.status === 'REQUESTED' && canApprove(row) && (
                    <Button variant="ghost" size="icon" onClick={() => onApprove(row.id)} title="Approve">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                )}

                {row.status === 'APPROVED' && canDeliver(row) && (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => onCreatePickingList(row)} title="Create Picking List">
                            <ClipboardCheck className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeliver(row.id)} title="Deliver">
                            <Truck className="h-4 w-4 text-orange-500" />
                        </Button>
                    </>
                )}

                {row.status === 'IN_TRANSIT' && canReceive(row) && (
                    <Button variant="ghost" size="icon" onClick={() => onReceive(row)} title="Receive">
                        <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                    </Button>
                )}

                {(row.status === 'IN_TRANSIT' || row.status === 'RECEIVED') && (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => onCreatePickingList(row)} title="Print Picking List">
                            <ClipboardCheck className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onPrintDO(row.transfer_number)} title="Print DO">
                            <FileText className="h-4 w-4 text-gray-500" />
                        </Button>
                    </>
                )}

                {(row.status === 'REQUESTED' || row.status === 'APPROVED') &&
                    (row.requested_by === user?.id || (user?.role === 'Admin' || user?.role?.name === 'Admin')) && (
                        <Button variant="ghost" size="icon" onClick={() => onCancel(row.id)} title="Cancel">
                            <XCircle className="h-4 w-4 text-red-500" />
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
            emptyMessage="No transfers found"
            emptyDescription="Create a new transfer request to move stock"
        />
    );
}
