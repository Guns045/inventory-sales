import React, { useState } from 'react';
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchBar } from "@/components/common/SearchBar"
import { FormDialog } from "@/components/common/FormDialog"
import { StatsCard } from "@/components/common/StatsCard"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { CategoryTable } from "@/components/categories/CategoryTable"
import { useCRUD } from "@/hooks/useCRUD"
import { useSearch } from "@/hooks/useSearch"
import { useModal } from "@/hooks/useModal"
import { useToast } from "@/hooks/useToast"
import { FolderOpen, Tag, FileText } from "lucide-react"

const Categories = () => {
  const { items: categories, loading, create, update, remove } = useCRUD('/categories');
  const { searchTerm, setSearchTerm } = useSearch();
  const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
  const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    openForm();
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    openForm();
  };

  const handleDelete = (category) => {
    setDeletingCategory(category);
    openDelete();
  };

  const handleSubmit = async () => {
    const result = editingCategory
      ? await update(editingCategory.id, formData)
      : await create(formData);

    if (result.success) {
      showSuccess(editingCategory ? 'Category updated successfully' : 'Category created successfully');
      closeForm();
    } else {
      showError(result.error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    const result = await remove(deletingCategory.id);
    if (result.success) {
      showSuccess('Category deleted successfully');
      closeDelete();
    } else {
      showError(result.error);
    }
  };

  const filteredCategories = searchTerm
    ? categories.filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : categories;

  const stats = {
    total: categories.length,
    withDescription: categories.filter(c => c.description).length,
    totalProducts: categories.reduce((sum, c) => sum + (c.products_count || 0), 0)
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Categories"
        description="Manage product categories"
        onAdd={handleAdd}
        addButtonText="Add Category"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Categories" value={stats.total} icon={<FolderOpen className="h-4 w-4" />} variant="primary" />
        <StatsCard title="With Description" value={stats.withDescription} icon={<FileText className="h-4 w-4" />} variant="success" />
        <StatsCard title="Total Products" value={stats.totalProducts} icon={<Tag className="h-4 w-4" />} variant="info" />
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search categories..." />

      <Card>
        <CategoryTable data={filteredCategories} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </Card>

      <FormDialog
        open={isFormOpen}
        onOpenChange={closeForm}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
        onSubmit={handleSubmit}
        submitText={editingCategory ? 'Update' : 'Create'}
      >
        <CategoryForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} isEditing={!!editingCategory} />
      </FormDialog>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={closeDelete}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? Products in this category will not be deleted.`}
        variant="destructive"
      />
    </div>
  );
};

export default Categories;