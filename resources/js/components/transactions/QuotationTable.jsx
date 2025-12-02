import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import {
    Pencil,
    Trash2,
    Send,
    CheckCircle,
    XCircle,
    ArrowRightCircle,
    Printer,
    Eye
} from 'lucide-react';

export function QuotationTable({
    data,
    loading,
    onEdit,
    onDelete,
    onApprove,
    onReject,
    onSubmit,
    onConvert,
    onPrint,
    onView
}) {
    const { user } = useAuth();

    const getAvailableActions = (quotation) => {
        const userRole = user?.role?.name || user?.role || '';
        const isSalesTeam = userRole.toLowerCase().includes('sales');
        const isAdmin = userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('manager');
        const isSuperAdmin = userRole === 'Super Admin';

        const actions = {
            canEdit: false,
            canDelete: false,
            canSubmit: false,
            canApprove: false,
            canReject: false,
            canConvertToSO: false,
            viewOnly: false,
            canView: true
        };

        // Sales Team specific logic
        if (isSalesTeam) {
            switch (quotation.status) {
                case 'DRAFT':
                    actions.canEdit = true;
                    actions.canDelete = true;
                    actions.canSubmit = true;
                    break;
                case 'SUBMITTED':
                    actions.viewOnly = true;
                    break;
                case 'APPROVED':
                    actions.canConvertToSO = true;
                    break;
                case 'REJECTED':
                    actions.canEdit = true;
                    actions.canSubmit = true;
                    break;
                case 'CONVERTED':
                    actions.viewOnly = true;
                    break;
            }
        }

        // Admin/Manager logic
        if (isAdmin) {
            switch (quotation.status) {
                case 'DRAFT':
                    actions.canEdit = true;
                    actions.canDelete = true;
                    actions.canSubmit = true;
                    break;
                case 'SUBMITTED':
                    actions.canApprove = true;
                    actions.canReject = true;
                    break;
                case 'APPROVED':
                    actions.canConvertToSO = true;
                    break;
                case 'REJECTED':
                    actions.canEdit = true;
                    actions.canDelete = true;
                    actions.canSubmit = true;
                    break;
                case 'CONVERTED':
                    actions.viewOnly = true;
                    break;
            }
        }

        // Super Admin logic
        if (isSuperAdmin) {
            actions.canDelete = true;
            switch (quotation.status) {
                case 'DRAFT':
                    actions.canEdit = true;
                    actions.canSubmit = true;
                    break;
                case 'SUBMITTED':
                    actions.canApprove = true;
                    actions.canReject = true;
                    break;
                case 'APPROVED':
                    actions.canConvertToSO = true;
                    break;
                case 'REJECTED':
                    actions.canEdit = true;
                    actions.canSubmit = true;
                    break;
                case 'CONVERTED':
                    actions.viewOnly = true;
                    break;
            }
        }

        return actions;
    };

    const columns = [
        {
            header: "Quotation Number",
            accessorKey: "quotation_number",
            cell: (row) => <span className="font-mono text-sm">{row.quotation_number}</span>
        },
        {
            header: "Customer",
            accessorKey: "customer.company_name",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.customer?.company_name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{row.customer?.contact_person}</div>
                </div>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => (
                <div className="flex flex-col gap-1">
                    <StatusBadge status={row.status} config={{
                        'SUBMITTED': { variant: 'warning', label: 'Submitted' },
                        'CONVERTED': { variant: 'secondary', label: 'Converted' }
                    }} />
                    {row.status === 'SUBMITTED' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Pending Approval
                        </span>
                    )}
                </div>
            )
        },
        {
            header: "Valid Until",
            accessorKey: "valid_until",
            cell: (row) => row.valid_until ? new Date(row.valid_until).toLocaleDateString() : '-'
        },
        {
            header: "Total Amount",
            accessorKey: "total_amount",
            cell: (row) => (
                <span className="font-medium text-blue-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.total_amount)}
                </span>
            )
        }
    ];

    // ... (existing columns) ...

    const renderActions = (row) => {
        const actions = getAvailableActions(row);
        return (
            <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => onView(row)} title="View Detail">
                    <Eye className="h-4 w-4 text-blue-500" />
                </Button>
                {actions.canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => onEdit(row)} title="Edit">
                        <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                )}
                {/* ... other buttons ... */}
                {actions.canSubmit && (
                    <Button variant="ghost" size="icon" onClick={() => onSubmit(row)} title="Submit">
                        <Send className="h-4 w-4 text-yellow-500" />
                    </Button>
                )}
                {actions.canApprove && (
                    <Button variant="ghost" size="icon" onClick={() => onApprove(row)} title="Approve">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                )}
                {actions.canReject && (
                    <Button variant="ghost" size="icon" onClick={() => onReject(row)} title="Reject">
                        <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                )}
                {actions.canConvertToSO && (
                    <Button variant="ghost" size="icon" onClick={() => onConvert(row)} title="Convert to SO">
                        <ArrowRightCircle className="h-4 w-4 text-cyan-500" />
                    </Button>
                )}
                {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED'].includes(row.status) && (
                    <Button variant="ghost" size="icon" onClick={() => onPrint(row)} title="Print">
                        <Printer className="h-4 w-4 text-gray-500" />
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
        />
    );
}
