import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductStockTable } from '@/components/inventory/ProductStockTable';
import { Plus, Search, RefreshCw, Loader2, CheckCircle, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import { FormDialog } from "@/components/common/FormDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Label } from "@/components/ui/label";

const ProductStock = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { showSuccess, showError } = useToast();

  const [productStock, setProductStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0
  });

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  // Bulk Delete State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: '',
    bin_location: ''
  });

  // Auto-suggest state
  const [productSearch, setProductSearch] = useState('');
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProductStock(1);
    setSelectedIds([]); // Clear selection on filter change
  }, [selectedWarehouse]); // Reset to page 1 when warehouse changes

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductStock(1);
      setSelectedIds([]); // Clear selection on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchProductStock = async (page = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page,
        per_page: 10
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedWarehouse && selectedWarehouse !== 'all') params.append('warehouse_id', selectedWarehouse);

      // Enable all-warehouses view mode when All Warehouses is selected
      if (selectedWarehouse === 'all') {
        params.append('view_mode', 'all-warehouses');
      }

      const response = await api.get(`/product-stock?${params}`);

      setProductStock(response.data.data || []);
      setPagination({
        current_page: response.data.meta?.current_page || response.data.current_page || 1,
        last_page: response.data.meta?.last_page || response.data.last_page || 1,
        total: response.data.meta?.total || response.data.total || 0
      });

    } catch (error) {
      console.error('Error fetching product stock:', error);
      showError('Failed to fetch product stock data');
    } finally {
      setLoading(false);
    }
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  const handleAdjustStock = (stock) => {
    setSelectedStock(stock);
    setFormData({
      product_id: stock.product_id,
      warehouse_id: stock.warehouse_id.toString(),
      quantity: stock.quantity,
      bin_location: stock.bin_location || ''
    });
    setProductSearch(`${stock.product.sku} - ${stock.product.name}`);
    setIsEditOpen(true);
  };

  const handleViewHistory = (stock) => {
    setSelectedStock(stock);
    setIsViewOpen(true);
  };

  const handleSubmitEdit = async () => {
    if (!selectedStock) return;

    try {
      await api.put(`/product-stock/${selectedStock.id}`, formData);
      showSuccess('Stock updated successfully');
      setIsEditOpen(false);
      fetchProductStock(pagination.current_page);
    } catch (error) {
      console.error('Error updating stock:', error);
      showError(error.response?.data?.message || 'Failed to update stock');
    }
  };

  const handleCreateStock = () => {
    setFormData({
      product_id: '',
      warehouse_id: '',
      quantity: '',
      bin_location: ''
    });
    setProductSearch('');
    setShowSuggestions(false);
    setIsCreateOpen(true);
  };

  const handleDeleteStock = (stock) => {
    setStockToDelete(stock);
    setIsDeleteOpen(true);
  };

  const handleProductSearchChange = async (e) => {
    const value = e.target.value;
    setProductSearch(value);
    // Clear selected product when user types
    if (formData.product_id) {
      setFormData(prev => ({ ...prev, product_id: '' }));
    }

    if (value.length === 0) {
      setSuggestedProducts(products.slice(0, 10));
      setShowSuggestions(true);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const response = await api.get(`/products?search=${value}&per_page=10`);
      setSuggestedProducts(response.data.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectProduct = (product) => {
    setFormData({ ...formData, product_id: product.id });
    setProductSearch(`${product.sku} - ${product.name}`);
    setShowSuggestions(false);
  };

  const handleSubmitCreate = async () => {
    if (!formData.product_id) {
      showError('Please select a valid product from the list');
      return;
    }

    try {
      const payload = {
        ...formData,
        reserved_quantity: 0
      };
      await api.post('/product-stock', payload);
      showSuccess('Stock created successfully');
      setIsCreateOpen(false);
      fetchProductStock(pagination.current_page);
    } catch (error) {
      console.error('Error creating stock:', error);
      showError(error.response?.data?.error || error.response?.data?.message || 'Failed to create stock');
    }
  };

  const handleConfirmDelete = async () => {
    if (!stockToDelete) return;
    try {
      await api.delete(`/product-stock/${stockToDelete.id}`);
      showSuccess('Stock deleted successfully');
      setIsDeleteOpen(false);
      fetchProductStock(pagination.current_page);
    } catch (error) {
      console.error('Error deleting stock:', error);
      showError(error.response?.data?.message || 'Failed to delete stock');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const response = await api.post('/product-stock/bulk-delete', { ids: selectedIds });

      if (response.status === 207) {
        // Partial success
        const { success_count, fail_count } = response.data.details;
        showSuccess(`Deleted ${success_count} items. Failed: ${fail_count}`);
      } else {
        showSuccess('Selected stocks deleted successfully');
      }

      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      fetchProductStock(pagination.current_page);
    } catch (error) {
      console.error('Error deleting stocks:', error);
      showError(error.response?.data?.message || 'Failed to delete selected stocks');
    }
  };

  const handleToggleVisibility = async () => {
    if (!selectedStock) return;

    try {
      const response = await api.post(`/product-stock/${selectedStock.id}/toggle-visibility`);
      showSuccess(response.data.message);

      // Update selected stock with new data
      setSelectedStock(response.data.data);

      // Refresh list
      fetchProductStock(pagination.current_page);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      showError(error.response?.data?.message || 'Failed to toggle visibility');
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Stock</h2>
          <p className="text-muted-foreground">Monitor and manage inventory across warehouses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => fetchProductStock(pagination.current_page)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreate('product-stock') && (
            <Button onClick={handleCreateStock} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Create Stock
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Stock Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product SKU, name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bulk Actions (Conditional) */}
            {selectedIds.length > 0 && canDelete('product-stock') && (
              <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.length})
              </Button>
            )}
          </div>

          {/* Table */}
          <ProductStockTable
            data={productStock}
            loading={loading}
            onAdjust={handleAdjustStock}
            onViewHistory={handleViewHistory}
            onDelete={handleDeleteStock}
            userRole={user?.role?.name || user?.role}
            canUpdate={canUpdate('product-stock')}
            canDelete={canDelete('product-stock')}
            warehouses={warehouses}
            viewMode={selectedWarehouse === 'all' ? 'all-warehouses' : 'per-warehouse'}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </CardContent>
      </Card>

      {/* Create Stock Dialog */}
      <FormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create Stock"
        description="Add new stock entry"
        onSubmit={handleSubmitCreate}
        submitText="Create"
        cancelText="Cancel"
      >
        <div className="space-y-4">
          <div className="space-y-2" ref={wrapperRef}>
            <Label>Product</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product by name or SKU..."
                value={productSearch}
                onChange={handleProductSearchChange}
                onClick={() => {
                  if (productSearch.length === 0) {
                    setSuggestedProducts(products.slice(0, 10));
                    setShowSuggestions(true);
                  }
                }}
                className="pl-9"
              />
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {loadingSuggestions ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : suggestedProducts.length > 0 ? (
                    suggestedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="font-medium">{product.sku}</div>
                        <div className="text-muted-foreground">{product.name}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">No products found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select
              value={formData.warehouse_id}
              onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label>Bin Location</Label>
            <Input
              value={formData.bin_location}
              onChange={(e) => setFormData({ ...formData, bin_location: e.target.value })}
              placeholder="Enter bin location"
            />
          </div>
        </div>
      </FormDialog>

      {/* Edit Stock Dialog */}
      <FormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Adjust Stock"
        description="Update stock quantity and location"
        onSubmit={handleSubmitEdit}
        submitText="Update Stock"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Input value={productSearch} disabled className="bg-gray-100" />
          </div>

          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select
              value={formData.warehouse_id}
              onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
              disabled
            >
              <SelectTrigger className="bg-gray-100">
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bin Location</Label>
              <Input
                value={formData.bin_location}
                onChange={(e) => setFormData({ ...formData, bin_location: e.target.value })}
              />
            </div>
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        title="Stock Details"
        description="View stock information"
        onSubmit={() => setIsViewOpen(false)}
        submitText="Close"
        cancelText=""
      >
        {selectedStock && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Product</Label>
                <div className="font-medium">{selectedStock.product?.name}</div>
                <div className="text-sm text-muted-foreground">{selectedStock.product?.sku}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Warehouse</Label>
                <div className="font-medium">{selectedStock.warehouse?.name}</div>
                <div className="text-sm text-muted-foreground">{selectedStock.warehouse?.code}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Quantity</Label>
                <div className="font-medium text-lg">
                  {selectedStock.quantity === null ? (
                    <span className="text-gray-400 italic">Hidden</span>
                  ) : (
                    selectedStock.quantity
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reserved</Label>
                <div className="font-medium text-lg text-orange-600">
                  {selectedStock.reserved_quantity === null ? (
                    <span className="text-gray-400 italic">Hidden</span>
                  ) : (
                    selectedStock.reserved_quantity
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Available</Label>
                <div className="font-medium text-lg text-green-600">
                  {selectedStock.available_quantity === null ? (
                    <span className="text-gray-400 italic">Hidden</span>
                  ) : (
                    selectedStock.available_quantity
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Bin Location</Label>
                <div className="font-medium">{selectedStock.bin_location || '-'}</div>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Last Updated</Label>
                <div className="font-medium">
                  {new Date(selectedStock.updated_at).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Hide/Unhide Button for Super Admin - Only when specific warehouse is selected */}
            {(user?.role === 'Super Admin' || user?.role?.name === 'Super Admin') && selectedWarehouse !== 'all' && (
              <div className="pt-4 border-t flex justify-end">
                <Button
                  variant={selectedStock.is_hidden ? "default" : "secondary"}
                  onClick={handleToggleVisibility}
                  className="w-full sm:w-auto"
                >
                  {selectedStock.is_hidden ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Unhide Stock
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" /> {/* Using Trash icon as placeholder for Hide, maybe EyeOff is better but not imported */}
                      Hide Stock
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </FormDialog>


      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Stock"
        message="Are you sure you want to delete this stock entry? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Delete Selected Stock"
        message={`Are you sure you want to delete ${selectedIds.length} stock entries? This action cannot be undone.`}
        confirmText="Delete Selected"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
};

export default ProductStock;