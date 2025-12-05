import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Save } from "lucide-react";

const CreateSalesReturn = () => {
    const { get, post } = useAPI();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [salesOrders, setSalesOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [orderItems, setOrderItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        reason: '',
        notes: '',
        items: [] // { product_id, quantity, condition, max_quantity }
    });

    useEffect(() => {
        fetchEligibleSalesOrders();
    }, []);

    const fetchEligibleSalesOrders = async () => {
        try {
            // Ideally, we should have an endpoint for this. For now, fetching all and filtering.
            // In a real app, use a dedicated endpoint like /sales-orders/eligible-for-return
            const response = await get('/sales-orders?status=SHIPPED,COMPLETED');
            // Also consider COMPLETED status

            if (response && response.data) {
                const orders = response.data.data || response.data || [];
                // Filter locally if API doesn't support multiple status params yet
                // Assuming the API returns what we asked or we filter here
                setSalesOrders(orders);
            }
        } catch (err) {
            console.error('Error fetching sales orders:', err);
            showError('Failed to fetch sales orders');
        }
    };

    const handleOrderSelect = async (orderId) => {
        setSelectedOrderId(orderId);
        setOrderItems([]);
        setFormData(prev => ({ ...prev, items: [] }));

        if (!orderId) return;

        try {
            setLoading(true);
            const response = await get(`/sales-orders/${orderId}/items`);
            if (response && response.data) {
                const items = response.data.data || response.data || [];
                setOrderItems(items);
            }
        } catch (err) {
            console.error('Error fetching order items:', err);
            showError('Failed to fetch order items');
        } finally {
            setLoading(false);
        }
    };

    const handleItemCheck = (item, checked) => {
        if (checked) {
            setFormData(prev => ({
                ...prev,
                items: [...prev.items, {
                    product_id: item.product_id,
                    quantity: 1,
                    condition: 'GOOD',
                    max_quantity: item.quantity,
                    product_name: item.product?.name
                }]
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter(i => i.product_id !== item.product_id)
            }));
        }
    };

    const handleItemChange = (productId, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.product_id === productId) {
                    if (field === 'quantity') {
                        const qty = parseInt(value) || 0;
                        if (qty > item.max_quantity) return item; // Prevent exceeding max
                        return { ...item, [field]: qty };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        }));
    };

    const handleSubmit = async () => {
        if (!selectedOrderId) {
            showError('Please select a Sales Order');
            return;
        }
        if (formData.items.length === 0) {
            showError('Please select at least one item to return');
            return;
        }
        if (!formData.reason) {
            showError('Please provide a reason for the return');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                sales_order_id: selectedOrderId,
                reason: formData.reason,
                notes: formData.notes,
                items: formData.items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    condition: item.condition
                }))
            };

            await post('/sales-returns', payload);
            showSuccess('Sales Return created successfully');
            navigate('/sales-returns');
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to create sales return');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Create Sales Return"
                description="Record a customer return"
                actions={
                    <Button variant="outline" onClick={() => navigate('/sales-returns')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Return Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Sales Order</Label>
                                <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a shipped sales order" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {salesOrders.map(order => (
                                            <SelectItem key={order.id} value={order.id.toString()}>
                                                {order.sales_order_number} - {order.customer?.company_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedOrderId && (
                                <div className="space-y-4 mt-4">
                                    <Label>Select Items to Return</Label>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead className="text-center">Shipped Qty</TableHead>
                                                    <TableHead className="w-[100px]">Return Qty</TableHead>
                                                    <TableHead className="w-[150px]">Condition</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {orderItems.map(item => {
                                                    const isSelected = formData.items.find(i => i.product_id === item.product_id);
                                                    return (
                                                        <TableRow key={item.id}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={!!isSelected}
                                                                    onCheckedChange={(checked) => handleItemCheck(item, checked)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold">{item.product?.sku}</span>
                                                                    <span className="text-sm text-muted-foreground">{item.product?.name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                                            <TableCell>
                                                                {isSelected && (
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        max={item.quantity}
                                                                        value={isSelected.quantity}
                                                                        onChange={(e) => handleItemChange(item.product_id, 'quantity', e.target.value)}
                                                                        className="h-8"
                                                                    />
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {isSelected && (
                                                                    <Select
                                                                        value={isSelected.condition}
                                                                        onValueChange={(v) => handleItemChange(item.product_id, 'condition', v)}
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="GOOD">Good</SelectItem>
                                                                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reason & Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Reason for Return</Label>
                                <Textarea
                                    placeholder="e.g., Wrong item sent, Damaged in transit"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Additional Notes</Label>
                                <Textarea
                                    placeholder="Any additional information..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                                <Save className="mr-2 h-4 w-4" />
                                {submitting ? 'Creating...' : 'Create Return'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CreateSalesReturn;
