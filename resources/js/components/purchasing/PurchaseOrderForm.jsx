import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from '@/hooks/useForm';
import { useLineItems } from '@/hooks/useLineItems';
import { LineItemsTable } from '@/components/common/LineItemsTable';
import { TransactionSummary } from '@/components/common/TransactionSummary';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from '@/components/common/FormDialog';
import { ProductForm } from '@/components/products/ProductForm';
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';

const schema = z.object({
    supplier_id: z.string().min(1, "Supplier is required"),
    warehouse_id: z.string().min(1, "Warehouse is required"),
    status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
    expected_delivery_date: z.string().min(1, "Expected delivery date is required"),
    notes: z.string().optional(),
});

export function PurchaseOrderForm({
    initialData,
    suppliers = [],
    warehouses = [],
    products = [],
    categories = [],
    onSubmit,
    onCancel,
    onSearchProducts,
    loading = false
}) {
    const { api } = useAPI();
    const { showSuccess, showError } = useToast();
    const { register, handleSubmit, errors, setValue, watch } = useForm(schema, {
        defaultValues: {
            supplier_id: initialData?.supplier_id?.toString() || '',
            warehouse_id: initialData?.warehouse_id?.toString() || '',
            status: initialData?.status || 'DRAFT',
            expected_delivery_date: initialData?.expected_delivery_date ? initialData.expected_delivery_date.split('T')[0] : '',
            notes: initialData?.notes || '',
        }
    });

    // Register custom form fields
    useEffect(() => {
        register('supplier_id');
        register('warehouse_id');
        register('status');
    }, [register]);

    const {
        items,
        addItem,
        updateItem,
        removeItem,
        setItems,
        totals
    } = useLineItems([]);

    // Create Product Modal State
    const [createProductModal, setCreateProductModal] = useState({
        isOpen: false,
        rowIndex: null,
        initialData: {}
    });
    const [localExtraProducts, setLocalExtraProducts] = useState([]);
    const [productFormLoading, setProductFormLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Load initial items
    useEffect(() => {
        if (initialData?.items && initialData.items.length > 0) {
            const mappedItems = initialData.items.map(item => ({
                ...item,
                product_id: item.product_id || item.product?.id,
                quantity: Number(item.quantity_ordered || item.quantity),
                unit_price: Number(item.unit_price),
                discount_percentage: Number(item.discount_percentage || 0),
                tax_rate: Number(item.tax_rate || 11) // Default 11% for PO items
            }));
            setItems(mappedItems);
        }
    }, [initialData, setItems]);

    const onFormSubmit = async (data) => {
        if (items.length === 0) {
            alert("Please add at least one item");
            return;
        }

        const payload = {
            ...data,
            items: items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage || 0,
                tax_rate: item.tax_rate || 0
            }))
        };

        await onSubmit(payload);
    };

    // Watch values for controlled inputs
    const status = watch('status');
    const supplierId = watch('supplier_id');
    const warehouseId = watch('warehouse_id');

    // Handle Create Product
    const handleCreateProduct = (rowIndex, searchTerm) => {
        setCreateProductModal({
            isOpen: true,
            rowIndex,
            initialData: {
                sku: searchTerm,
                name: '',
                buy_price: '',
                sell_price: '',
                min_stock_level: ''
            }
        });
    };

    const handleProductSubmit = async (productData) => {
        try {
            setProductFormLoading(true);
            const response = await api.post('/products', productData);
            const newProduct = response.data.data;

            // Add to local extra products list
            setLocalExtraProducts(prev => [...prev, newProduct]);

            // Update line item with new product
            if (createProductModal.rowIndex !== null) {
                updateItem(createProductModal.rowIndex, {
                    ...items[createProductModal.rowIndex],
                    product_id: newProduct.id,
                    unit_price: parseFloat(newProduct.buy_price || 0)
                });
            }

            showSuccess('Product created successfully');
            setCreateProductModal({ isOpen: false, rowIndex: null, initialData: {} });
        } catch (error) {
            console.error('Failed to create product:', error);
            showError(error.response?.data?.message || 'Failed to create product. Please check the form.');
        } finally {
            setProductFormLoading(false);
        }
    };

    // Handle search to filter local products
    const handleSearch = useCallback((query) => {
        setSearchTerm(query);
        if (onSearchProducts) {
            onSearchProducts(query);
        }
    }, [onSearchProducts]);

    // Filter local products based on search term
    const filteredLocalProducts = localExtraProducts.filter(p => {
        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();
        return (
            p.name.toLowerCase().includes(lowerTerm) ||
            (p.sku && p.sku.toLowerCase().includes(lowerTerm))
        );
    });

    // Merge passed products with filtered locally created ones for the dropdown
    const allProducts = [...products, ...filteredLocalProducts];

    return (
        <>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{initialData ? 'Edit Purchase Order' : 'New Purchase Order'}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="supplier_id">Supplier</Label>
                                <Select
                                    value={supplierId}
                                    onValueChange={(value) => setValue('supplier_id', value, { shouldValidate: true })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.supplier_id && <p className="text-sm text-red-500">{errors.supplier_id.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="warehouse_id">Warehouse</Label>
                                <Select
                                    value={warehouseId}
                                    onValueChange={(value) => setValue('warehouse_id', value, { shouldValidate: true })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id.toString()}>
                                                {w.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.warehouse_id && <p className="text-sm text-red-500">{errors.warehouse_id.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={status}
                                    onValueChange={(value) => setValue('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="SENT">Sent</SelectItem>
                                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                                <Input
                                    type="date"
                                    {...register('expected_delivery_date')}
                                />
                                {errors.expected_delivery_date && <p className="text-sm text-red-500">{errors.expected_delivery_date.message}</p>}
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Enter additional notes..."
                                    {...register('notes')}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Line Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LineItemsTable
                            items={items}
                            products={allProducts}
                            onAdd={addItem}
                            onUpdate={updateItem}
                            onRemove={removeItem}
                            onSearch={handleSearch}
                            onCreateProduct={handleCreateProduct}
                            editable={true}
                            priceType="buy_price"
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <div className="w-full md:w-1/3">
                        <TransactionSummary
                            subtotal={totals.subtotal}
                            discount={totals.discount}
                            tax={totals.tax}
                            total={totals.total}
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : (initialData ? 'Update Purchase Order' : 'Create Purchase Order')}
                    </Button>
                </div>
            </form>

            <FormDialog
                open={createProductModal.isOpen}
                onOpenChange={(open) => setCreateProductModal(prev => ({ ...prev, isOpen: open }))}
                title="Create New Product"
                description="Add a new product to the system and this purchase order."
                onSubmit={() => handleProductSubmit(createProductModal.initialData)}
                loading={productFormLoading}
                submitText="Create Product"
            >
                <ProductForm
                    formData={createProductModal.initialData}
                    categories={categories}
                    suppliers={suppliers}
                    onChange={(newData) => setCreateProductModal(prev => ({ ...prev, initialData: newData }))}
                    onSubmit={handleProductSubmit}
                />
            </FormDialog>
        </>
    );
}
