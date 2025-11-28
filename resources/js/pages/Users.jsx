import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchBar } from "@/components/common/SearchBar"
import { FormDialog } from "@/components/common/FormDialog"
import { StatsCard } from "@/components/common/StatsCard"
import { Pagination } from "@/components/common/Pagination"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { UserForm } from "@/components/users/UserForm"
import { UserTable } from "@/components/users/UserTable"
import { useCRUD } from "@/hooks/useCRUD"
import { useSearch } from "@/hooks/useSearch"
import { useModal } from "@/hooks/useModal"
import { useToast } from "@/hooks/useToast"
import { useAPI } from '@/contexts/APIContext';
import { Users as UsersIcon, UserCheck, UserX, Shield } from "lucide-react"

const Users = () => {
  const { api } = useAPI();

  // Custom hooks
  const {
    items: users,
    loading,
    error,
    pagination,
    create,
    update,
    remove,
    setPage,
    refresh
  } = useCRUD('/users');

  const { searchTerm, setSearchTerm } = useSearch();
  const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
  const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
  const { isOpen: isStatusOpen, open: openStatus, close: closeStatus } = useModal();
  const { showSuccess, showError } = useToast();

  // Local state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role_id: '',
    password: '',
    password_confirmation: '',
    warehouse_id: '',
    can_access_multiple_warehouses: false
  });
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [statusUser, setStatusUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Fetch roles and warehouses
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, warehousesRes] = await Promise.all([
          api.get('/roles'),
          api.get('/warehouses')
        ]);
        setRoles(rolesRes.data.data || rolesRes.data);
        setWarehouses(warehousesRes.data.data || warehousesRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
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
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role_id: '',
      password: '',
      password_confirmation: '',
      warehouse_id: 'null',
      can_access_multiple_warehouses: false
    });
    openForm();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      password: '',
      password_confirmation: '',
      warehouse_id: user.warehouse_id || 'null',
      can_access_multiple_warehouses: !!user.can_access_multiple_warehouses
    });
    openForm();
  };

  const handleDelete = (user) => {
    setDeletingUser(user);
    openDelete();
  };

  const handleStatusChangeRequest = (user) => {
    setStatusUser(user);
    openStatus();
  };

  const handleSubmit = async () => {
    const payload = { ...formData };

    // Handle warehouse_id logic
    if (payload.warehouse_id === 'null' || payload.warehouse_id === '') {
      payload.warehouse_id = null;
    }

    // Remove password if empty in edit mode
    if (editingUser && !payload.password) {
      delete payload.password;
      delete payload.password_confirmation;
    }

    const result = editingUser
      ? await update(editingUser.id, payload)
      : await create(payload);

    if (result.success) {
      showSuccess(
        editingUser ? 'User updated successfully' : 'User created successfully'
      );
      closeForm();
    } else {
      showError(result.error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;

    const result = await remove(deletingUser.id);
    if (result.success) {
      showSuccess('User deleted successfully');
      closeDelete();
    } else {
      showError(result.error);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusUser) return;

    try {
      const newStatus = !statusUser.is_active;
      await api.put(`/users/${statusUser.id}/status`, {
        status: newStatus ? 'activate' : 'deactivate',
        is_active: newStatus ? 1 : 0
      });
      showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      refresh();
      closeStatus();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Calculate stats
  const stats = {
    total: pagination.total,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admins: users.filter(u => u.role?.name === 'Admin' || u.role?.name === 'Super Admin').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="User Management"
        description="Manage system users and their roles"
        onAdd={handleAdd}
        addButtonText="Add User"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.total}
          icon={<UsersIcon className="h-4 w-4" />}
          variant="primary"
        />
        <StatsCard
          title="Active Users"
          value={stats.active}
          icon={<UserCheck className="h-4 w-4" />}
          variant="success"
        />
        <StatsCard
          title="Inactive Users"
          value={stats.inactive}
          icon={<UserX className="h-4 w-4" />}
          variant="danger"
        />
        <StatsCard
          title="Admins"
          value={stats.admins}
          icon={<Shield className="h-4 w-4" />}
          variant="info"
        />
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search users by name or email..."
      />

      {/* Users Table */}
      <Card>
        <UserTable
          data={users}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChangeRequest}
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
        title={editingUser ? 'Edit User' : 'Add New User'}
        description="Fill in the user details below"
        onSubmit={handleSubmit}
        submitText={editingUser ? 'Update' : 'Create'}
      >
        <UserForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          roles={roles}
          warehouses={warehouses}
          isEditing={!!editingUser}
        />
      </FormDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={closeDelete}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deletingUser?.name}"? This action cannot be undone.`}
        variant="destructive"
        confirmText="Delete"
      />

      {/* Status Change Confirmation */}
      <ConfirmDialog
        open={isStatusOpen}
        onOpenChange={closeStatus}
        onConfirm={confirmStatusChange}
        title={statusUser?.is_active ? "Deactivate User" : "Activate User"}
        message={`Are you sure you want to ${statusUser?.is_active ? 'deactivate' : 'activate'} "${statusUser?.name}"?`}
        variant={statusUser?.is_active ? "warning" : "default"}
        confirmText={statusUser?.is_active ? "Deactivate" : "Activate"}
      />
    </div>
  );
};

export default Users;