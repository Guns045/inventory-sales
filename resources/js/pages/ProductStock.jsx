import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductStockTable } from '@/components/inventory/ProductStockTable';
import { Plus, Search, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import { FormDialog } from "@/components/common/FormDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Label } from "@/components/ui/label";

const ProductStock = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const { canCreate } = usePermissions();
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
  }, [selectedWarehouse]); // Reset to page 1 when warehouse changes

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductStock(1);
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

  const handleAdjustStock = (stock) => {
    // TODO: Implement adjust stock modal
    console.log('Adjust stock', stock);
  };

  const handleViewHistory = (stock) => {
    // TODO: Implement view history modal
    console.log('View history', stock);
  };

  const handleCreateStock = () => {
    setFormData({
      product_id: '',
      warehouse_id: '',
      quantity: '',
      bin_location: ''
    });
    setProductSearch('');
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

    if (value.length < 2) {
      setSuggestedProducts([]);
      setShowSuggestions(false);
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
    setProductSearch(`${product.name} (${product.sku})`);
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

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Stock</h2>
          <p className="text-muted-foreground">
            Monitor and manage inventory across warehouses
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => fetchProductStock(pagination.current_page)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canCreate('product-stock') && (
            <Button onClick={handleCreateStock}>
              <Plus className="mr-2 h-4 w-4" />
              Create Stock
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Stock Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by product SKU, name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="w-full md:w-[250px]">
                <Select
                  value={selectedWarehouse}
                  onValueChange={setSelectedWarehouse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ProductStockTable
              data={productStock}
              loading={loading}
              onAdjust={handleAdjustStock}
              onViewHistory={handleViewHistory}
              onDelete={handleDeleteStock}
              userRole={user?.role?.name}
              canUpdate={canCreate('product-stock')} // Assuming create implies update for now, or use specific permission
              canDelete={canCreate('product-stock')} // Assuming create implies delete for now
              warehouses={warehouses}
              viewMode={selectedWarehouse === 'all' ? 'all-warehouses' : 'per-warehouse'}
            />
          </CardContent>
        </Card>
      </div>

      <FormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create Stock"
        description="Add new stock entry"
        onSubmit={handleSubmitCreate}
        submitText="Create"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <div className="relative" ref={wrapperRef}>
              <Input
                placeholder="Search product by name or SKU..."
                value={productSearch}
                onChange={handleProductSearchChange}
                onFocus={() => {
                  if (productSearch.length >= 2) setShowSuggestions(true);
                }}
              />
              {loadingSuggestions && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {showSuggestions && suggestedProducts.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {suggestedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.sku}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!formData.product_id && productSearch.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Please select a product from the dropdown list
              </p>
            )}
            {formData.product_id && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Product selected
              </p>
            )}
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

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Stock"
        message="Are you sure you want to delete this stock entry? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ProductStock;