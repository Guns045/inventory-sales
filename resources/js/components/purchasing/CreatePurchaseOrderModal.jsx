import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';

const CreatePurchaseOrderModal = ({
    isOpen,
    onClose,
    onSuccess,
    order = null,
    suppliers = [],
    warehouses = [],
    products = []
}) => {
    const { api } = useAPI();
    const { showSuccess, showError } = useToast();
    const wrapperRef = useRef(null);

    // Form Data
    const [formData, setFormData] = useState({
        supplier_id: '',
        warehouse_id: '',
        status: 'DRAFT',
        expected_delivery_date: '',
        notes: ''
    });

    const [items, setItems] = useState([]);

    const [newItem, setNewItem] = useState({
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 11
    });

    // Search State
    const [productSearch, setProductSearch] = useState('');
    const [suggestedProducts, setSuggestedProducts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (order) {
                populateForm(order);
            } else {
                resetForm();
            }
        }
    }, [isOpen, order]);

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

    const populateForm = (order) => {
        setFormData({
            supplier_id: order.supplier_id?.toString() || '',
            warehouse_id: order.warehouse_id?.toString() || '',
            status: order.status,
            expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '',
            notes: order.notes || ''
        });

        if (order.items) {
            const mappedItems = order.items.map(item => ({
                id: item.id,
                product_id: (item.product_id || item.product?.id)?.toString() || '',
                product_name: item.product?.name || 'Unknown',
                part_number: item.product?.part_number || '',
                description: item.product?.description || '',
                quantity: item.quantity_ordered || 0,
                unit_price: item.unit_price || 0,
                tax_rate: 11,
                subtotal: (item.quantity_ordered || 0) * (item.unit_price || 0),
                tax_amount: ((item.quantity_ordered || 0) * (item.unit_price || 0)) * 0.11,
                total: ((item.quantity_ordered || 0) * (item.unit_price || 0)) * 1.11
            }));
            setItems(mappedItems);
        } else {
            setItems([]);
        }
    };

    const resetForm = () => {
        setItems([]);
        setFormData({
            supplier_id: '',
            warehouse_id: '',
            status: 'DRAFT',
            expected_delivery_date: '',
            notes: ''
        });
        setNewItem({
            product_id: '',
            product_name: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 11
        });
        setProductSearch('');
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNewItemChange = (field, value) => {
        if (field === 'product_id') {
            const selectedProduct = products.find(p => p.id === parseInt(value));
            const unitPrice = selectedProduct ? selectedProduct.buy_price || 0 : 0;
            const productName = selectedProduct ? (selectedProduct.name || selectedProduct.description || '') : '';

            setNewItem(prev => ({
                ...prev,
                product_id: value,
                product_name: productName,
                unit_price: unitPrice
            }));
        } else {
            setNewItem(prev => ({ ...prev, [field]: value }));
        }
    };

    const calculateItemTotal = (quantity, unitPrice, taxRate) => {
        const subtotal = quantity * unitPrice;
        const taxAmount = subtotal * (taxRate / 100);
        return {
            subtotal,
            taxAmount,
            total: subtotal + taxAmount
        };
    };

    const addItem = () => {
        if (!newItem.product_id || newItem.quantity <= 0) return;

        const selectedProduct = products.find(p => p.id === parseInt(newItem.product_id));
        const quantity = parseInt(newItem.quantity) || 1;
        const unitPrice = parseFloat(newItem.unit_price);
        const taxRate = parseFloat(newItem.tax_rate);

        const calculations = calculateItemTotal(quantity, unitPrice, taxRate);

        const item = {
            id: Date.now(),
            product_id: newItem.product_id,
            product_name: selectedProduct ? (selectedProduct.name || selectedProduct.description) : 'Unknown',
            sku: selectedProduct?.sku || '',
            part_number: selectedProduct?.part_number || '',
            description: selectedProduct?.description || '',
            quantity,
            unit_price: unitPrice,
            tax_rate: taxRate,
            subtotal: calculations.subtotal,
            tax_amount: calculations.taxAmount,
            total: calculations.total
        };

        setItems(prev => [...prev, item]);
        setNewItem({
            product_id: '',
            product_name: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 11
        });
        setProductSearch('');
    };

    const removeItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleProductSearchChange = async (e) => {
        const value = e.target.value;
        setProductSearch(value);

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
        const unitPrice = product.buy_price || 0;
        const productName = product.name || product.description || '';

        setNewItem(prev => ({
            ...prev,
            product_id: product.id.toString(),
            product_name: productName,
            unit_price: unitPrice
        }));
        setProductSearch(`${productName} (${product.sku})`);
        setShowSuggestions(false);
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            showError('Please add at least one item');
            return;
        }

        try {
            const payload = {
                ...formData,
                items: items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    notes: item.notes
                }))
            };

            if (order) {
                await api.put(`/purchase-orders/${order.id}`, payload);
                showSuccess('Purchase order updated successfully');
            } else {
                await api.post('/purchase-orders', payload);
                showSuccess('Purchase order created successfully');
            }

            onSuccess();
        } catch (err) {
            showError('Failed to save purchase order');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{order ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Select value={formData.supplier_id} onValueChange={(v) => handleInputChange('supplier_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Warehouse</Label>
                            <Select value={formData.warehouse_id} onValueChange={(v) => handleInputChange('warehouse_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Expected Date</Label>
                            <Input
                                type="date"
                                value={formData.expected_delivery_date}
                                onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="SENT">Sent</SelectItem>
                                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            placeholder="Optional notes..."
                        />
                    </div>

                    {/* Items Section */}
                    <div className="border rounded-md p-4 space-y-4">
                        <h3 className="font-semibold">Order Items</h3>

                        <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-4 space-y-2">
                                <Label>Product</Label>
                                <div className="relative" ref={wrapperRef}>
                                    <Input
                                        placeholder="Search product..."
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
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Qty</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={newItem.quantity}
                                    onChange={(e) => handleNewItemChange('quantity', e.target.value)}
                                />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label>Unit Price</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={newItem.unit_price}
                                    onChange={(e) => handleNewItemChange('unit_price', e.target.value)}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Tax (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={newItem.tax_rate}
                                    onChange={(e) => handleNewItemChange('tax_rate', e.target.value)}
                                />
                            </div>
                            <div className="col-span-1">
                                <Button onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        {items.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, idx) => (
                                        <TableRow key={item.id || idx}>
                                            <TableCell>
                                                <div className="font-medium">{item.part_number}</div>
                                                <div className="text-xs text-muted-foreground">{item.product_name}</div>
                                            </TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                                            <TableCell>{formatCurrency(item.total)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Order</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreatePurchaseOrderModal;
