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

const ShippingDetailsModal = ({ isOpen, onClose, onSave, order, loading, submitLabel = 'Save & Ship' }) => {
    const [formData, setFormData] = useState({
        delivery_method: 'Truck',
        delivery_vendor: '',
        tracking_number: '',
        driver_name: '',
        vehicle_plate_number: '',
        shipping_contact_person: ''
    });

    useEffect(() => {
        if (order) {
            setFormData({
                delivery_method: order.delivery_method || 'Truck',
                delivery_vendor: order.delivery_vendor || '',
                tracking_number: order.tracking_number || '',
                driver_name: order.driver_name || '',
                vehicle_plate_number: order.vehicle_plate_number || '',
                shipping_contact_person: order.shipping_contact_person || order.customer?.contact_person || ''
            });
        }
    }, [order]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(order, formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Shipping Details {order?.delivery_order_number !== 'PENDING' ? `- ${order?.delivery_order_number}` : ''}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="delivery_method">Delivery Method</Label>
                            <Select
                                value={formData.delivery_method}
                                onValueChange={(value) => handleSelectChange('delivery_method', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Internal">Internal Fleet</SelectItem>
                                    <SelectItem value="Truck">Trucking</SelectItem>
                                    <SelectItem value="Air Freight">Air Freight</SelectItem>
                                    <SelectItem value="Sea Freight">Sea Freight</SelectItem>
                                    <SelectItem value="Bus Cargo">Bus Cargo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="delivery_vendor">Vendor / Expedition</Label>
                            <Input
                                id="delivery_vendor"
                                name="delivery_vendor"
                                value={formData.delivery_vendor}
                                onChange={handleChange}
                                placeholder="e.g. JNE, PO Litha"
                                disabled={formData.delivery_method === 'Internal'}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tracking_number">Tracking Number / Resi</Label>
                        <Input
                            id="tracking_number"
                            name="tracking_number"
                            value={formData.tracking_number}
                            onChange={handleChange}
                            placeholder="Optional"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="driver_name">Driver / Courier Name</Label>
                            <Input
                                id="driver_name"
                                name="driver_name"
                                value={formData.driver_name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vehicle_plate_number">Vehicle / Flight No</Label>
                            <Input
                                id="vehicle_plate_number"
                                name="vehicle_plate_number"
                                value={formData.vehicle_plate_number}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="shipping_contact_person">Recipient Contact Person</Label>
                        <Input
                            id="shipping_contact_person"
                            name="shipping_contact_person"
                            value={formData.shipping_contact_person}
                            onChange={handleChange}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : submitLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShippingDetailsModal;
