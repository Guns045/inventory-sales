import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Edit,
    Trash2,
    Play,
    Pause
} from 'lucide-react';

export function UserTable({
    data,
    loading,
    onEdit,
    onDelete,
    onStatusChange
}) {
    const columns = [
        {
            header: "Name",
            accessorKey: "name",
            cell: (row) => <span className="font-medium">{row.name}</span>
        },
        {
            header: "Email",
            accessorKey: "email",
        },
        {
            header: "Role",
            accessorKey: "role.name",
            cell: (row) => (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {row.role?.name || '-'}
                </Badge>
            )
        },
        {
            header: "Status",
            accessorKey: "is_active",
            cell: (row) => (
                <Badge
                    variant={row.is_active ? "success" : "destructive"}
                    className={row.is_active ? "bg-green-100 text-green-800 hover:bg-green-200 border-0" : "bg-red-100 text-red-800 hover:bg-red-200 border-0"}
                >
                    {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            header: "Warehouse",
            accessorKey: "warehouse.name",
            cell: (row) => row.warehouse?.name || '-'
        }
    ];

    const renderActions = (row) => {
        return (
            <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => onEdit(row)} title="Edit">
                    <Edit className="h-4 w-4 text-gray-500" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onStatusChange(row)}
                    title={row.is_active ? "Deactivate" : "Activate"}
                >
                    {row.is_active ? (
                        <Pause className="h-4 w-4 text-orange-500" />
                    ) : (
                        <Play className="h-4 w-4 text-green-500" />
                    )}
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
            emptyMessage="No users found"
            emptyDescription="Get started by adding a new user"
        />
    );
}
