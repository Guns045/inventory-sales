import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from 'lucide-react';

export function RoleTable({
    data,
    loading,
    onEdit,
    onDelete
}) {
    const columns = [
        {
            header: "Role Name",
            accessorKey: "name",
            cell: (row) => <span className="font-medium">{row.name}</span>
        },
        {
            header: "Guard Name",
            accessorKey: "guard_name",
            cell: (row) => <Badge variant="outline">{row.guard_name}</Badge>
        },
        {
            header: "Permissions",
            accessorKey: "permissions_count",
            cell: (row) => (
                <Badge variant="secondary">
                    {row.permissions_count || row.permissions?.length || 0} Permissions
                </Badge>
            )
        }
    ];

    const renderActions = (row) => {
        // Prevent editing/deleting Super Admin
        if (row.name === 'Super Admin') {
            return <span className="text-xs text-gray-400 italic">System Role</span>;
        }

        return (
            <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => onEdit(row)} title="Edit">
                    <Edit className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(row)} title="Delete">
                    <Trash2 className="h-4 w-4 text-red-500" />
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
            emptyMessage="No roles found"
            emptyDescription="Get started by adding a new role"
        />
    );
}
