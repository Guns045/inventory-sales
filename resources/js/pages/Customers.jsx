import React, { useState } from 'react';
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchBar } from "@/components/common/SearchBar"
import { FormDialog } from "@/components/common/FormDialog"
import { StatsCard } from "@/components/common/StatsCard"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { CustomerForm } from "@/components/customers/CustomerForm"
import { CustomerTable } from "@/components/customers/CustomerTable"
import { useCRUD } from "@/hooks/useCRUD"
import { useSearch } from "@/hooks/useSearch"
import { useModal } from "@/hooks/useModal"
import { useToast } from "@/hooks/useToast"
import { Users, UserCheck, Building2 } from "lucide-react"

const Customers = () => {
  // Custom hooks
  const {
    items: customers,
    loading,
    create,
    update,
    remove,
    refresh
  } = useCRUD('/customers');

  const { searchTerm, setSearchTerm } = useSearch();
  const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
  const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
  const { showSuccess, showError } = useToast();

  // Local state
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: ''
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  // Handlers
  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      tax_id: ''
    });
    openForm();
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      company_name: customer.company_name,
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      tax_id: customer.tax_id || ''
    });
    openForm();
  };

  const handleDelete = (customer) => {
    setDeletingCustomer(customer);
    openDelete();
  };

  const handleSubmit = async () => {
    const result = editingCustomer
      ? await update(editingCustomer.id, formData)
      : await create(formData);

    if (result.success) {
      showSuccess(
        editingCustomer ? 'Customer updated successfully' : 'Customer created successfully'
      );
      closeForm();
    } else {
      showError(result.error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCustomer) return;

    const result = await remove(deletingCustomer.id);
    if (result.success) {
      showSuccess('Customer deleted successfully');
      closeDelete();
    } else {
      showError(result.error);
    }
  };

  // Filter customers by search term
  const filteredCustomers = searchTerm
    ? customers.filter(c =>
      c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : customers;

  // Calculate stats
  const stats = {
    total: customers.length,
    withEmail: customers.filter(c => c.email).length,
    withPhone: customers.filter(c => c.phone).length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        onAdd={handleAdd}
        addButtonText="Add Customer"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Customers"
          value={stats.total}
          icon={<Users className="h-4 w-4" />}
          variant="primary"
        />
        <StatsCard
          title="With Email"
          value={stats.withEmail}
          icon={<UserCheck className="h-4 w-4" />}
          variant="success"
        />
        <StatsCard
          title="With Phone"
          value={stats.withPhone}
          icon={<Building2 className="h-4 w-4" />}
          variant="info"
        />
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search customers by name, contact, or email..."
      />

      {/* Customers Table */}
      <Card>
        <CustomerTable
          data={filteredCustomers}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      {/* Form Dialog */}
      <FormDialog
        open={isFormOpen}
        onOpenChange={closeForm}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        description="Fill in the customer details below"
        onSubmit={handleSubmit}
        submitText={editingCustomer ? 'Update' : 'Create'}
      >
        <CustomerForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          isEditing={!!editingCustomer}
        />
      </FormDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={closeDelete}
        onConfirm={confirmDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deletingCustomer?.company_name}"? This action cannot be undone.`}
        variant="destructive"
        confirmText="Delete"
      />
    </div>
  );
};

export default Customers;