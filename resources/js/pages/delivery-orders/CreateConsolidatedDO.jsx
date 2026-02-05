import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Truck, CheckCircle, ChevronDown, ChevronRight, PackageCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const CreateConsolidatedDO = () => {
    const navigate = useNavigate();
    const { api } = useAPI();
    const { showSuccess, showError } = useToast();

    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [pendingItems, setPendingItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState({}); // { sales_order_item_id: quantity_to_ship }
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedSOs, setExpandedSOs] = useState({}); // { [soNumber]: boolean }

    const [formData, setFormData] = useState({
        shipping_date: new Date().toISOString().split('T')[0],
        shipping_address: '',
        driver_name: '',
        vehicle_plate_number: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (selectedCustomerId) {
            fetchPendingItems(selectedCustomerId);
            // Determine default shipping address from customer (optional)
            const customer = customers.find(c => c.id.toString() === selectedCustomerId);
            if (customer) {
                setFormData(prev => ({
                    ...prev,
                    shipping_address: customer.address || customer.shipping_address || ''
                }));
            }
        } else {
            setPendingItems([]);
            setSelectedItems({});
            setExpandedSOs({});
        }
    }, [selectedCustomerId]);

    // Group items by Sales Order
    const groupedItems = useMemo(() => {
        const groups = {};
        pendingItems.forEach(item => {
            const soNum = item.sales_order_number;
            if (!groups[soNum]) {
                groups[soNum] = {
                    so_number: soNum,
                    items: []
                };
            }
            groups[soNum].items.push(item);
        });
        return Object.values(groups);
    }, [pendingItems]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data.data || response.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchPendingItems = async (customerId) => {
        setLoading(true);
        try {
            const response = await api.get(`/delivery-orders/pending-items/${customerId}`);
            let items = [];
            if (Array.isArray(response.data)) {
                items = response.data;
            } else if (response.data && Array.isArray(response.data.data)) {
                items = response.data.data;
            } else if (typeof response.data === 'object' && response.data !== null) {
                items = Object.values(response.data);
            }

            setPendingItems(items);
            setSelectedItems({});
            setExpandedSOs({});
        } catch (error) {
            showError('Failed to fetch pending items');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSO = (soNumber) => {
        setExpandedSOs(prev => ({
            ...prev,
            [soNumber]: !prev[soNumber]
        }));
    };

    const handleCheckboxChange = (item, checked) => {
        setSelectedItems(prev => {
            const newSelection = { ...prev };
            if (checked) {
                newSelection[item.id] = item.remaining_quantity;
            } else {
                delete newSelection[item.id];
            }
            return newSelection;
        });
    };

    const toggleAllInSO = (soGroup, checked) => {
        setSelectedItems(prev => {
            const newSelection = { ...prev };
            soGroup.items.forEach(item => {
                if (checked) {
                    newSelection[item.id] = item.remaining_quantity;
                } else {
                    delete newSelection[item.id];
                }
            });
            return newSelection;
        });
    };

    const handleQuantityChange = (itemId, qty, max) => {
        const val = parseInt(qty);
        if (isNaN(val) || val < 0) return;

        setSelectedItems(prev => ({
            ...prev,
            [itemId]: val
        }));
    };

    const handleSubmit = async () => {
        const itemsPayload = Object.entries(selectedItems).map(([id, qty]) => ({
            sales_order_item_id: parseInt(id),
            quantity_to_ship: parseInt(qty)
        })).filter(i => i.quantity_to_ship > 0);

        if (itemsPayload.length === 0) {
            showError('Please select at least one item to ship');
            return;
        }

        if (!formData.shipping_address) {
            showError('Shipping address is required');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                customer_id: selectedCustomerId,
                ...formData,
                items: itemsPayload
            };

            await api.post('/delivery-orders/consolidated', payload);
            showSuccess('Delivery Order created successfully');
            navigate('/delivery-orders');
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to create delivery order');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/delivery-orders')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Create Delivery Order</h2>
                    <p className="text-muted-foreground">Select one or multiple Sales Orders to generate a Delivery Order</p>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-1 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Delivery Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Customer</Label>
                                <Select
                                    value={selectedCustomerId}
                                    onValueChange={(v) => setSelectedCustomerId(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.company_name} {c.sales_orders_count > 0 && `(${c.sales_orders_count})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Shipping Date</Label>
                                <Input
                                    type="date"
                                    value={formData.shipping_date}
                                    onChange={(e) => setFormData({ ...formData, shipping_date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Input
                                    value={formData.shipping_address}
                                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                                    placeholder="Full shipping address"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Driver Name</Label>
                                <Input
                                    value={formData.driver_name}
                                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vehicle Plate</Label>
                                <Input
                                    value={formData.vehicle_plate_number}
                                    onChange={(e) => setFormData({ ...formData, vehicle_plate_number: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Select Items to Ship</CardTitle>
                            {Object.keys(selectedItems).length > 0 && (
                                <div className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                    {Object.keys(selectedItems).length} items selected
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {!selectedCustomerId ? (
                                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                    Please select a customer first
                                </div>
                            ) : loading ? (
                                <div className="text-center py-10">Loading pending items...</div>
                            ) : pendingItems.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                    No pending items found for this customer.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {groupedItems.map((group) => {
                                        const isExpanded = !!expandedSOs[group.so_number];
                                        const itemsInSO = group.items;
                                        const selectedInSO = itemsInSO.filter(i => !!selectedItems[i.id]);
                                        const isAllSelected = selectedInSO.length === itemsInSO.length;
                                        const isSomeSelected = selectedInSO.length > 0 && !isAllSelected;

                                        return (
                                            <div key={group.so_number} className="border rounded-lg overflow-hidden transition-all duration-200">
                                                {/* Header SO */}
                                                <div
                                                    className={`p-3 cursor-pointer flex items-center justify-between border-b bg-muted/30 hover:bg-muted/50 transition-colors ${selectedInSO.length > 0 ? 'border-l-4 border-l-primary' : ''}`}
                                                    onClick={() => toggleSO(group.so_number)}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={isAllSelected}
                                                                onCheckedChange={(c) => toggleAllInSO(group, c)}
                                                                className={isSomeSelected ? 'opacity-50' : ''}
                                                            />
                                                        </div>
                                                        <span className="font-semibold text-sm">{group.so_number}</span>
                                                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border">
                                                            {itemsInSO.length} items
                                                        </span>
                                                        {selectedInSO.length > 0 && (
                                                            <span className="text-xs font-medium text-primary">
                                                                ({selectedInSO.length} selected)
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </div>

                                                {/* Details items (Expandable) */}
                                                {isExpanded && (
                                                    <div className="bg-background">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-muted/10">
                                                                <tr>
                                                                    <th className="p-2 w-[40px]"></th>
                                                                    <th className="p-2 text-left">Product</th>
                                                                    <th className="p-2 text-right">Remaining</th>
                                                                    <th className="p-2 text-right w-[100px]">Ship Qty</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y text-sm">
                                                                {itemsInSO.map(item => {
                                                                    const isSelected = !!selectedItems[item.id];
                                                                    return (
                                                                        <tr key={item.id} className={isSelected ? 'bg-primary/5' : 'hover:bg-muted/5'}>
                                                                            <td className="p-2 text-center">
                                                                                <Checkbox
                                                                                    checked={isSelected}
                                                                                    onCheckedChange={(c) => handleCheckboxChange(item, c)}
                                                                                />
                                                                            </td>
                                                                            <td className="p-2">
                                                                                <div className="font-medium">{item.product_name}</div>
                                                                            </td>
                                                                            <td className="p-2 text-right text-muted-foreground">{item.remaining_quantity}</td>
                                                                            <td className="p-2">
                                                                                <Input
                                                                                    type="number"
                                                                                    className="h-7 text-right text-xs"
                                                                                    value={selectedItems[item.id] || ''}
                                                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value, item.remaining_quantity)}
                                                                                    disabled={!isSelected}
                                                                                    max={item.remaining_quantity}
                                                                                    min={1}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="mt-8 flex justify-end">
                                <Button
                                    size="lg"
                                    onClick={handleSubmit}
                                    className="px-8 shadow-lg"
                                    disabled={submitting || Object.keys(selectedItems).length === 0}
                                >
                                    {submitting ? (
                                        <>Generating...</>
                                    ) : (
                                        <>
                                            <PackageCheck className="mr-2 h-5 w-5" />
                                            Generate Delivery Order
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CreateConsolidatedDO;

