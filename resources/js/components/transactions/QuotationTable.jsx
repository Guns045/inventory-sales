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
        // ... (existing logic) ...
        // Always allow view
        return { ...actions, canView: true };
    };

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
