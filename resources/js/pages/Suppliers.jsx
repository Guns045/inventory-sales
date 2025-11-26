import React, { useState } from 'react';
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchBar } from "@/components/common/SearchBar"
import { FormDialog } from "@/components/common/FormDialog"
import { StatsCard } from "@/components/common/StatsCard"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { SupplierForm } from "@/components/suppliers/SupplierForm"
import { SupplierTable } from "@/components/suppliers/SupplierTable"
import { useCRUD } from "@/hooks/useCRUD"
import { useSearch } from "@/hooks/useSearch"
import { useModal } from "@/hooks/useModal"
import { useToast } from "@/hooks/useToast"
import { Truck, Phone, MapPin } from "lucide-react"

const Suppliers = () => {
  const { items: suppliers, loading, create, update, remove } = useCRUD('/suppliers');
  const { searchTerm, setSearchTerm } = useSearch();
  const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
  const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', address: '' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);

  const handleAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contact_person: '', phone: '', address: '' });
    openForm();
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      address: supplier.address || ''
    });
    openForm();
  };

  const handleDelete = (supplier) => {
    setDeletingSupplier(supplier);
    openDelete();
  };

  const handleSubmit = async () => {
    const result = editingSupplier
      ? await update(editingSupplier.id, formData)
      : await create(formData);

    if (result.success) {
      showSuccess(editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully');
      closeForm();
    } else {
      showError(result.error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingSupplier) return;
    const result = await remove(deletingSupplier.id);
    if (result.success) {
      showSuccess('Supplier deleted successfully');
      closeDelete();
    } else {
      showError(result.error);
    }
  };

  const filteredSuppliers = searchTerm
    ? suppliers.filter(s =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : suppliers;

  const stats = {
    total: suppliers.length,
    withPhone: suppliers.filter(s => s.phone).length,
    withAddress: suppliers.filter(s => s.address).length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier database"
        onAdd={handleAdd}
        addButtonText="Add Supplier"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Suppliers" value={stats.total} icon={<Truck className="h-4 w-4" />} variant="primary" />
        <StatsCard title="With Phone" value={stats.withPhone} icon={<Phone className="h-4 w-4" />} variant="success" />
        <StatsCard title="With Address" value={stats.withAddress} icon={<MapPin className="h-4 w-4" />} variant="info" />
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search suppliers..." />

      <Card>
        <SupplierTable data={filteredSuppliers} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </Card>

      <FormDialog
        open={isFormOpen}
        onOpenChange={closeForm}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        onSubmit={handleSubmit}
        submitText={editingSupplier ? 'Update' : 'Create'}
      >
        <SupplierForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} isEditing={!!editingSupplier} />
      </FormDialog>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={closeDelete}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deletingSupplier?.name}"?`}
        variant="destructive"
      />
    </div>
  );
};

export default Suppliers;