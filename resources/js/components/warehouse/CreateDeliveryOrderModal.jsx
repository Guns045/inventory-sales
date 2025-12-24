import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Package, Truck, Search } from "lucide-react";
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';

const CreateDeliveryOrderModal = ({ isOpen, onClose, onSuccess }) => {
    const { api } = useAPI();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [salesOrders, setSalesOrders] = useState([]);
    const [selectedSO, setSelectedSO] = useState(null);
    const [itemsToShip, setItemsToShip] = useState({});

    useEffect(() => {
        if (isOpen) {
            fetchReadySalesOrders();
            setSelectedSO(null);
            setItemsToShip({});
        }
    }, [isOpen]);

    const fetchReadySalesOrders = async () => {
        try {
            const response = await api.get('/delivery-orders/ready-to-create');
            setSalesOrders(response.data);
        } catch (error) {
            console.error('Error fetching sales orders:', error);
            toast({
                title: "Error",
                description: "Failed to fetch sales orders",
                variant: "destructive",
            });
        }
    };

    const handleSelectSO = (soId) => {
        const so = salesOrders.find(s => s.id.toString() === soId);
        if (!so) return;

        setSelectedSO(so);

        // Initialize items
        const initialItems = {};
        so.items.forEach(item => {
            const remaining = item.quantity - (item.quantity_shipped || 0);
            initialItems[item.id] = remaining;
        });
        setItemsToShip(initialItems);
    };

    const handleQuantityChange = (itemId, value, max) => {
        const qty = parseInt(value) || 0;
        if (qty < 0) return;
        setItemsToShip(prev => ({
            ...prev,
            [itemId]: qty
        }));
    };

    const handleSubmit = async () => {
        if (!selectedSO) return;

        setLoading(true);
        try {
            const itemsPayload = Object.entries(itemsToShip).map(([id, quantity]) => ({
                id: parseInt(id),
                quantity: quantity
            })).filter(item => item.quantity > 0);

            if (itemsPayload.length === 0) {
                toast({
                    title: "Error",
                    description: "Please select at least one item to ship",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            await api.post('/delivery-orders', {
                sales_order_id: selectedSO.id,
                customer_id: selectedSO.customer_id,
                items: itemsPayload,
                status: 'PREPARING', // Default status
                shipping_date: new Date().toISOString().split('T')[0], // Default to today
            });

            toast({
                title: "Success",
                description: "Delivery Order created successfully",
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating DO:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to create Delivery Order",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Delivery Order</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Sales Order Selection */}
                    <div className="space-y-2">
                        <Label>Select Sales Order</Label>
                        <Select onValueChange={handleSelectSO}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Sales Order..." />
                            </SelectTrigger>
                            <SelectContent>
                                {salesOrders.length === 0 ? (
                                    <SelectItem value="none" disabled>No Sales Orders ready</SelectItem>
                                ) : (
                                    salesOrders.map(so => (
                                        <SelectItem key={so.id} value={so.id.toString()}>
                                            {so.sales_order_number} - {so.customer?.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedSO && (
                        <>
                            {/* Items to Ship Table */}
                            <div className="border rounded-md p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-medium flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Items to Ship
                                    </h3>
                                    <div className="text-sm text-muted-foreground">
                                        SO: {selectedSO.sales_order_number}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2">Product</th>
                                                <th className="text-center py-2">Ordered</th>
                                                <th className="text-center py-2">Shipped</th>
                                                <th className="text-center py-2">Remaining</th>
                                                <th className="text-right py-2">Ship Now</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSO.items.map(item => {
                                                const ordered = item.quantity;
                                                const shipped = item.quantity_shipped || 0;
                                                const remaining = ordered - shipped;

                                                return (
                                                    <tr key={item.id} className="border-b last:border-0">
                                                        <td className="py-2">
                                                            <div className="font-medium">{item.product?.name}</div>
                                                            <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                                                        </td>
                                                        <td className="text-center py-2">{ordered}</td>
                                                        <td className="text-center py-2">{shipped}</td>
                                                        <td className="text-center py-2">{remaining}</td>
                                                        <td className="text-right py-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max={remaining}
                                                                value={itemsToShip[item.id] || 0}
                                                                onChange={(e) => handleQuantityChange(item.id, e.target.value, remaining)}
                                                                className="w-20 ml-auto h-8"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !selectedSO}>
                        {loading ? 'Creating...' : 'Create Delivery Order'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateDeliveryOrderModal;
