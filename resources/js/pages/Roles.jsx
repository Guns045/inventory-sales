import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchBar } from "@/components/common/SearchBar"
import { FormDialog } from "@/components/common/FormDialog"
import { Pagination } from "@/components/common/Pagination"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RoleForm } from "@/components/roles/RoleForm"
import { RoleTable } from "@/components/roles/RoleTable"
import { useCRUD } from "@/hooks/useCRUD"
import { useSearch } from "@/hooks/useSearch"
import { useModal } from "@/hooks/useModal"
import { useToast } from "@/hooks/useToast"
import { useAPI } from '@/contexts/APIContext';

const Roles = () => {
    const { api } = useAPI();

    // Custom hooks
    const {
        items: roles,
        loading,
        error,
        pagination,
        create,
        update,
        remove,
        setPage,
        refresh
    } = useCRUD('/roles');

    const { searchTerm, setSearchTerm } = useSearch();
    const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
    const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
    const { showSuccess, showError } = useToast();

    // Local state
    const [formData, setFormData] = useState({
        name: '',
        permissions: []
    });
    const [editingRole, setEditingRole] = useState(null);
    const [deletingRole, setDeletingRole] = useState(null);
    const [groupedPermissions, setGroupedPermissions] = useState({});

    // Fetch permissions
    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await api.get('/permissions/grouped');
                setGroupedPermissions(response.data);
            } catch (err) {
                console.error('Error fetching permissions:', err);
            }
        };
        fetchPermissions();
    }, [api]);

    // Search effect
    useEffect(() => {
        if (searchTerm) {
            refresh({ search: searchTerm });
        } else {
            refresh();
        }
    }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handlers
    const handleAdd = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            permissions: []
        });
        openForm();
    };

    const handleEdit = async (role) => {
        setEditingRole(role);
        // Fetch full role details including permissions if not already present
        // Or assume role object has permissions. 
        // Usually list endpoint might not return all permissions.
        // Let's fetch the single role to be sure.
        try {
            const response = await api.get(`/roles/${role.id}`);
            const fullRole = response.data.data || response.data;

            setFormData({
                name: fullRole.name,
                permissions: fullRole.permissions?.map(p => p.id) || []
            });
            openForm();
        } catch (err) {
            showError('Failed to fetch role details');
        }
    };

    const handleDelete = (role) => {
        setDeletingRole(role);
        openDelete();
    };

    const handleSubmit = async () => {
        const result = editingRole
            ? await update(editingRole.id, formData)
            : await create(formData);

        if (result.success) {
            showSuccess(
                editingRole ? 'Role updated successfully' : 'Role created successfully'
            );
            closeForm();
        } else {
            showError(result.error);
        }
    };

    const confirmDelete = async () => {
        if (!deletingRole) return;

        const result = await remove(deletingRole.id);
        if (result.success) {
            showSuccess('Role deleted successfully');
            closeDelete();
        } else {
            showError(result.error);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Page Header */}
            <PageHeader
                title="Role Management"
                description="Manage user roles and permissions"
                onAdd={handleAdd}
                addButtonText="Add Role"
            />

            {/* Search Bar */}
            <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search roles..."
            />

            {/* Roles Table */}
            <Card>
                <RoleTable
                    data={roles}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                {/* Pagination */}
                {pagination.total > 0 && (
                    <Pagination
                        currentPage={pagination.current_page}
                        totalPages={pagination.last_page}
                        onPageChange={setPage}
                        from={pagination.from}
                        to={pagination.to}
                        total={pagination.total}
                    />
                )}
            </Card>

            {/* Form Dialog */}
            <FormDialog
                open={isFormOpen}
                onOpenChange={closeForm}
                title={editingRole ? 'Edit Role' : 'Add New Role'}
                description="Configure role details and permissions"
                onSubmit={handleSubmit}
                submitText={editingRole ? 'Update' : 'Create'}
                maxWidth="max-w-4xl" // Wider modal for permissions matrix
            >
                <RoleForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    groupedPermissions={groupedPermissions}
                />
            </FormDialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={isDeleteOpen}
                onOpenChange={closeDelete}
                onConfirm={confirmDelete}
                title="Delete Role"
                message={`Are you sure you want to delete "${deletingRole?.name}"? This action cannot be undone.`}
                variant="destructive"
                confirmText="Delete"
            />
        </div>
    );
};

export default Roles;
