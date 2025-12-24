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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

const MarkDeliveredModal = ({ isOpen, onClose, deliveryOrder, onConfirm }) => {
    const [items, setItems] = useState([]);
    const [recipientName, setRecipientName] = useState('');
    const [recipientTitle, setRecipientTitle] = useState('');

    useEffect(() => {
        if (deliveryOrder && deliveryOrder.items) {
            setItems(deliveryOrder.items.map(item => ({
                ...item,
                quantity_delivered: item.quantity_shipped, // Default to full shipment
                status: 'DELIVERED',
                notes: '',
                isSelected: true
            })));
        }
    }, [deliveryOrder]);

    const handleQuantityChange = (id, value) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, quantity_delivered: parseInt(value) || 0 } : item
        ));
    };

    const handleStatusChange = (id, checked) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, isSelected: checked, status: checked ? 'DELIVERED' : 'PARTIAL' } : item
        ));
    };

    const handleSubmit = () => {
        const deliveryItems = items.map(item => ({
            delivery_order_item_id: item.id,
            quantity_delivered: item.quantity_delivered,
            status: item.isSelected ? 'DELIVERED' : 'PARTIAL', // Simplified logic
            notes: item.notes
        }));

        onConfirm(deliveryOrder, {
            recipient_name: recipientName,
            recipient_title: recipientTitle,
            delivery_items: deliveryItems
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Mark Delivery Order as Delivered</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Recipient Name</Label>
                            <Input
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="Who received the package?"
                            />
                        </div>
                        <div>
                            <Label>Recipient Title/Position</Label>
                            <Input
                                value={recipientTitle}
                                onChange={(e) => setRecipientTitle(e.target.value)}
                                placeholder="e.g. Warehouse Staff, Security"
                            />
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Shipped Qty</TableHead>
                                <TableHead>Delivered Qty</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.product?.name}</TableCell>
                                    <TableCell>{item.quantity_shipped}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={item.quantity_delivered}
                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            className="w-24"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                checked={item.isSelected}
                                                onCheckedChange={(checked) => handleStatusChange(item.id, checked)}
                                            />
                                            <span>{item.isSelected ? 'Delivered' : 'Partial/Issue'}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Confirm Delivery</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MarkDeliveredModal;
