import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/common/DataTable";
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  Upload,
  Trash2,
  Search,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  AlertTriangle,
  Check,
  Import
} from "lucide-react";

const MasterDataProducts = () => {
  const { user } = useAuth();
  const { api } = useAPI();
  const { showSuccess, showError } = useToast();

  // State management
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    supplier: 'all'
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 100,
    total: 0
  });

  const [formData, setFormData] = useState({
    excel_file: null
  });

  useEffect(() => {
    fetchRawProducts();
    fetchStatistics();
  }, [searchTerm, filters, pagination.current_page]);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/settings/raw-products/statistics');
      setStatistics(response.data.statistics);
      setCategories(response.data.categories);
      setSuppliers(response.data.suppliers);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchRawProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: searchTerm,
      });

      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.supplier !== 'all') params.append('supplier', filters.supplier);

      const response = await api.get(`/settings/raw-products?${params}`);
      setRawProducts(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching raw products:', error);
      showError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      showError('Please upload a valid Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB');
      return;
    }

    setFormData({ excel_file: file });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.excel_file) {
      showError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('excel_file', formData.excel_file);

      const response = await api.post('/settings/raw-products/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showSuccess(`Successfully uploaded ${response.data.imported_count} products!`);
      setUploadPreview(response.data.preview || []);
      setShowPreviewModal(true);
      setShowUploadModal(false);
      setFormData({ excel_file: null });

      await fetchRawProducts();
      await fetchStatistics();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/settings/raw-products/${id}`);
      await fetchRawProducts();
      await fetchStatistics();
      showSuccess('Product deleted successfully');
    } catch (error) {
      showError('Failed to delete product');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return;

    try {
      await api.post('/settings/raw-products/bulk-delete', { ids: selectedProducts });
      setSelectedProducts([]);
      await fetchRawProducts();
      await fetchStatistics();
      showSuccess('Products deleted successfully');
    } catch (error) {
      showError('Failed to delete products');
    }
  };

  const handleImportToProducts = async () => {
    const mode = selectedProducts.length > 0 ? 'selected' : 'all';
    const message = mode === 'selected'
      ? `Import ${selectedProducts.length} selected products to main product list?`
      : 'Import ALL unprocessed raw products to main product list?';

    if (!confirm(message)) return;

    try {
      setLoading(true);
      const response = await api.post('/settings/raw-products/import', {
        ids: selectedProducts,
        mode: mode
      });

      showSuccess(response.data.message);
      setSelectedProducts([]);
      await fetchRawProducts();
      await fetchStatistics();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to import products');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === rawProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(rawProducts.map(p => p.id));
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const columns = [
    {
      id: "select",
      header: (
        <Checkbox
          checked={rawProducts.length > 0 && selectedProducts.length === rawProducts.length}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: (row) => (
        <Checkbox
          checked={selectedProducts.includes(row.id)}
          onCheckedChange={() => handleSelectProduct(row.id)}
        />
      ),
    },
    {
      header: "Part Number",
      accessorKey: "part_number",
      cell: (row) => <span className="font-medium">{row.part_number}</span>
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (row) => <div className="max-w-[300px] truncate" title={row.description}>{row.description}</div>
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (row) => <Badge variant="outline">{row.category || 'Uncategorized'}</Badge>
    },
    {
      header: "Supplier",
      accessorKey: "supplier",
      cell: (row) => row.supplier || '-'
    },
    {
      header: "Buy Price",
      accessorKey: "buy_price",
      cell: (row) => formatCurrency(row.buy_price)
    },
    {
      header: "Sell Price",
      accessorKey: "sell_price",
      cell: (row) => formatCurrency(row.sell_price)
    },
    {
      header: "Status",
      accessorKey: "is_processed",
      cell: (row) => (
        <Badge variant={row.is_processed ? "success" : "warning"}>
          {row.is_processed ? "Processed" : "Raw"}
        </Badge>
      )
    },
    {
      header: "Actions",
      id: "actions",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteProduct(row.id)}
          className="text-destructive hover:text-destructive/90"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{statistics.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-amber-500">{statistics.unprocessed || 0}</div>
            <p className="text-xs text-muted-foreground">Raw Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-500">{statistics.processed || 0}</div>
            <p className="text-xs text-muted-foreground">Processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-500">{statistics.categories || 0}</div>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Excel
          </Button>
          <Button onClick={handleImportToProducts} variant="outline">
            <Import className="mr-2 h-4 w-4" />
            {selectedProducts.length > 0 ? 'Import Selected' : 'Import All Unprocessed'}
          </Button>
          {selectedProducts.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedProducts.length})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="raw">Raw</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.supplier} onValueChange={(v) => setFilters({ ...filters, supplier: v })}>
          <SelectTrigger>
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map(sup => (
              <SelectItem key={sup} value={sup}>{sup}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Master Data Products</CardTitle>
          <CardDescription>Manage and process uploaded product data</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rawProducts}
            loading={loading}
            emptyMessage={
              <div className="text-center py-6">
                <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-semibold">No products found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filters.status !== 'all'
                    ? 'Try adjusting your filters or search terms.'
                    : 'Upload your first Excel file to get started.'}
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Master Data Products</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Excel Format Requirements</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                  <li><strong>part_number</strong> (Required) - Also accepts: partnumber, part_no, sku, kode_barang</li>
                  <li><strong>description</strong> (Required) - Also accepts: desc, product_name, nama_barang</li>
                  <li><strong>category</strong> (Optional)</li>
                  <li><strong>supplier</strong> (Optional)</li>
                  <li><strong>buy_price</strong> (Optional)</li>
                  <li><strong>sell_price</strong> (Optional)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="excel-upload">Select Excel File</Label>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                required
              />
              <p className="text-xs text-muted-foreground">Supported: .xlsx, .xls, .csv (Max 10MB)</p>
            </div>

            {formData.excel_file && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="truncate flex-1">{formData.excel_file.name}</span>
                <span className="text-xs">{(formData.excel_file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading || !formData.excel_file}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Upload Successful
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
              <Check className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your Excel file has been successfully uploaded and processed!
              </AlertDescription>
            </Alert>

            {uploadPreview.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted px-4 py-2 text-sm font-medium">First 5 rows preview</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Part Number</th>
                        <th className="px-4 py-2 font-medium">Description</th>
                        <th className="px-4 py-2 font-medium">Category</th>
                        <th className="px-4 py-2 font-medium">Supplier</th>
                        <th className="px-4 py-2 font-medium">Buy Price</th>
                        <th className="px-4 py-2 font-medium">Sell Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {uploadPreview.map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 font-medium">{product.part_number}</td>
                          <td className="px-4 py-2">{product.description}</td>
                          <td className="px-4 py-2">{product.category || '-'}</td>
                          <td className="px-4 py-2">{product.supplier || '-'}</td>
                          <td className="px-4 py-2">{formatCurrency(product.buy_price)}</td>
                          <td className="px-4 py-2">{formatCurrency(product.sell_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setShowPreviewModal(false);
              setUploadPreview([]);
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterDataProducts;