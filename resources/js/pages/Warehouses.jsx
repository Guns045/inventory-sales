import React, { useState } from 'react';
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchBar } from "@/components/common/SearchBar"
import { FormDialog } from "@/components/common/FormDialog"
import { StatsCard } from "@/components/common/StatsCard"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { WarehouseForm } from "@/components/warehouses/WarehouseForm"
import { WarehouseTable } from "@/components/warehouses/WarehouseTable"
import { useCRUD } from "@/hooks/useCRUD"
import { useSearch } from "@/hooks/useSearch"
import { useModal } from "@/hooks/useModal"
import { useToast } from "@/hooks/useToast"
import { Warehouse, MapPin, Package } from "lucide-react"

const Warehouses = () => {
  const { items: warehouses, loading, create, update, remove } = useCRUD('/warehouses');
  const { searchTerm, setSearchTerm } = useSearch();
  const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
  const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({ name: '', location: '', code: '' });
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [deletingWarehouse, setDeletingWarehouse] = useState(null);

  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({ name: '', location: '', code: '' });
    openForm();
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location || '',
      code: warehouse.code || ''
    });
    openForm();
  };

  const handleDelete = (warehouse) => {
    setDeletingWarehouse(warehouse);
    openDelete();
  };

  const handleSubmit = async () => {
    const result = editingWarehouse
      ? await update(editingWarehouse.id, formData)
      : await create(formData);

    if (result.success) {
      showSuccess(editingWarehouse ? 'Warehouse updated successfully' : 'Warehouse created successfully');
      closeForm();
    } else {
      showError(result.error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingWarehouse) return;
    const result = await remove(deletingWarehouse.id);
    if (result.success) {
      showSuccess('Warehouse deleted successfully');
      closeDelete();
    } else {
      showError(result.error);
    }
  };

  const filteredWarehouses = searchTerm
    ? warehouses.filter(w =>
      w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.code?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : warehouses;

  const stats = {
    total: warehouses.length,
    withLocation: warehouses.filter(w => w.location).length,
    totalStock: warehouses.reduce((sum, w) => sum + (w.stock_count || 0), 0)
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations"
        onAdd={handleAdd}
        addButtonText="Add Warehouse"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Warehouses" value={stats.total} icon={<Warehouse className="h-4 w-4" />} variant="primary" />
        <StatsCard title="With Location" value={stats.withLocation} icon={<MapPin className="h-4 w-4" />} variant="success" />
        <StatsCard title="Total Stock Items" value={stats.totalStock} icon={<Package className="h-4 w-4" />} variant="info" />
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search warehouses..." />

      <Card>
        <WarehouseTable data={filteredWarehouses} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </Card>

      <FormDialog
        open={isFormOpen}
        onOpenChange={closeForm}
        title={editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
        onSubmit={handleSubmit}
        submitText={editingWarehouse ? 'Update' : 'Create'}
      >
        <WarehouseForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} isEditing={!!editingWarehouse} />
      </FormDialog>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={closeDelete}
        onConfirm={confirmDelete}
        title="Delete Warehouse"
        message={`Are you sure you want to delete "${deletingWarehouse?.name}"? Stock items in this warehouse will not be deleted.`}
        variant="destructive"
      />
    </div>
  );
};

export default Warehouses;