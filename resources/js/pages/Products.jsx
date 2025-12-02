import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchBar } from "@/components/common/SearchBar"
import { FormDialog } from "@/components/common/FormDialog"
import { StatsCard } from "@/components/common/StatsCard"
import { Pagination } from "@/components/common/Pagination"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ProductForm } from "@/components/products/ProductForm"
import { ProductTable } from "@/components/products/ProductTable"
import { useCRUD } from "@/hooks/useCRUD"
import { useSearch } from "@/hooks/useSearch"
import { useModal } from "@/hooks/useModal"
import { useToast } from "@/hooks/useToast"
import { useAPI } from '@/contexts/APIContext';
import { Package, TrendingUp, AlertTriangle, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"

const Products = () => {
  const { api } = useAPI();

  // Custom hooks
  const {
    items: products,
    loading,
    error,
    pagination,
    create,
    update,
    remove,
    setPage,
    refresh
  } = useCRUD('/products');

  const { searchTerm, setSearchTerm } = useSearch();
  const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
  const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
  const { showSuccess, showError } = useToast();

  // Local state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    supplier_id: '',
    buy_price: '',
    sell_price: '',
    min_stock_level: ''
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Fetch categories, suppliers, and stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, suppliersRes, statsRes] = await Promise.all([
          api.get('/categories'),
          api.get('/suppliers'),
          api.get('/products/statistics')
        ]);
        setCategories(categoriesRes.data);
        setSuppliers(suppliersRes.data);
        setStats({
          total: statsRes.data.total,
          inStock: statsRes.data.in_stock,
          lowStock: statsRes.data.low_stock,
          outOfStock: statsRes.data.out_of_stock,
          totalValue: statsRes.data.total_value
        });
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, [api, products]); // Refresh stats when products change (e.g. create/delete)

  // Search effect
  useEffect(() => {
    if (searchTerm) {
      refresh({ search: searchTerm, per_page: 20 });
    } else {
      refresh({ per_page: 20 });
    }
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      supplier_id: '',
      buy_price: '',
      sell_price: '',
      min_stock_level: ''
    });
    openForm();
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      min_stock_level: product.min_stock_level
    });
    openForm();
  };

  const handleDelete = (product) => {
    setDeletingProduct(product);
    openDelete();
  };

  const handleSubmit = async () => {
    const result = editingProduct
      ? await update(editingProduct.id, formData)
      : await create(formData);

    if (result.success) {
      showSuccess(
        editingProduct ? 'Product updated successfully' : 'Product created successfully'
      );
      closeForm();
    } else {
      showError(result.error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;

    const result = await remove(deletingProduct.id);
    if (result.success) {
      showSuccess('Product deleted successfully');
      closeDelete();
    } else {
      showError(result.error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('/products/bulk-delete', { ids: selectedIds });
      showSuccess(`${selectedIds.length} products deleted successfully`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      refresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showError('Failed to delete selected products');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <PageHeader
          title="Products"
          description="Manage your product inventory"
          onAdd={handleAdd}
          addButtonText="Add Product"
        />
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setIsBulkDeleteOpen(true)}
            className="ml-4"
          >
            <Archive className="mr-2 h-4 w-4" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Products"
          value={stats.total}
          icon={<Package className="h-4 w-4" />}
          variant="primary"
        />
        <StatsCard
          title="In Stock"
          value={stats.inStock}
          icon={<TrendingUp className="h-4 w-4" />}
          variant="success"
        />
        <StatsCard
          title="Low Stock"
          value={stats.lowStock}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="warning"
        />
        <StatsCard
          title="Out of Stock"
          value={stats.outOfStock}
          icon={<Archive className="h-4 w-4" />}
          variant="danger"
        />
      </div>

      {/* Total Inventory Value */}
      <div className="text-right">
        <span className="text-sm text-gray-600">Total Inventory Value: </span>
        <span className="text-lg font-bold text-blue-600">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
          }).format(stats.totalValue)}
        </span>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search products by name, SKU, or category..."
      />

      {/* Products Table */}
      <Card>
        <ProductTable
          data={products}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
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
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        description="Fill in the product details below"
        onSubmit={handleSubmit}
        submitText={editingProduct ? 'Update' : 'Create'}
      >
        <ProductForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          categories={categories}
          suppliers={suppliers}
          isEditing={!!editingProduct}
        />
      </FormDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={closeDelete}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        variant="destructive"
        confirmText="Delete"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        title="Delete Selected Products"
        message={`Are you sure you want to delete ${selectedIds.length} selected products? This action cannot be undone.`}
        variant="destructive"
        confirmText="Delete Selected"
      />
    </div>
  );
};

export default Products;