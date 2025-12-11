import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import SuperAdminActions from '@/components/admin/SuperAdminActions';

const DeliveryOrderDetailsModal = ({ isOpen, onClose, order }) => {
    if (!order) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'PREPARING': return 'bg-blue-100 text-blue-800';
            case 'READY_TO_SHIP': return 'bg-green-100 text-green-800';
            case 'SHIPPED': return 'bg-yellow-100 text-yellow-800';
            case 'DELIVERED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const isPendingSO = order.is_pending_so;
    const orderNumber = isPendingSO ? order.sales_order_number : order.delivery_order_number;
    const orderDate = order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy') : '-';
    const shippingDate = order.shipping_date ? format(new Date(order.shipping_date), 'dd MMM yyyy') : '-';

    // Determine items source
    const items = order.items || [];

    // Calculate total weight
    const totalWeight = items.reduce((sum, item) => {
        const weight = item.product?.weight || 0;
        const qty = isPendingSO ? item.quantity : (item.quantity_shipped || item.quantity_delivered || item.quantity_ordered || 0);
        return sum + (weight * qty);
    }, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center mr-8">
                        <div>
                            <DialogTitle className="text-xl">
                                {isPendingSO ? 'Sales Order Details' : 'Delivery Order Details'}
                            </DialogTitle>
                            <DialogDescription>
                                {orderNumber}
                            </DialogDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                            {order.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Customer Information</h3>
                            <div className="text-sm space-y-1">
                                <p className="font-medium">{order.customer?.company_name || order.customer?.name}</p>
                                <p className="text-muted-foreground">{order.customer?.contact_person}</p>
                                <p className="text-muted-foreground">{order.customer?.phone}</p>
                                <p className="text-muted-foreground">{order.customer?.email}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Order Information</h3>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Order Date:</span>
                                    <span>{orderDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping Date:</span>
                                    <span>{shippingDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Warehouse:</span>
                                    <span>{order.warehouse?.name || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div >

                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Shipping Details</h3>
                            <div className="text-sm space-y-1">
                                <p><span className="text-muted-foreground">Address:</span> {order.shipping_address || order.customer?.address || 'N/A'}</p>
                                <p><span className="text-muted-foreground">City:</span> {order.shipping_city || order.customer?.city || 'N/A'}</p>
                                <p><span className="text-muted-foreground">Contact:</span> {order.shipping_contact_person || order.customer?.contact_person || 'N/A'}</p>
                                {order.driver_name && (
                                    <p><span className="text-muted-foreground">Driver:</span> {order.driver_name}</p>
                                )}
                                {order.vehicle_plate_number && (
                                    <p><span className="text-muted-foreground">Vehicle:</span> {order.vehicle_plate_number}</p>
                                )}
                            </div>
                        </div>

                        {order.notes && (
                            <div>
                                <h3 className="font-semibold mb-2">Notes</h3>
                                <p className="text-sm text-muted-foreground">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div >

                <Separator />

                <div className="py-4">
                    <h3 className="font-semibold mb-4">Order Items</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Part Number</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Weight (kg)</TableHead>
                                {!isPendingSO && <TableHead className="text-right">Shipped</TableHead>}
                                <TableHead>Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={item.id || index}>
                                    <TableCell>
                                        <div className="font-medium">{item.product?.sku || item.product_code || 'N/A'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.product?.name || item.product_name || 'N/A'}</div>
                                        {item.product?.description && (
                                            <div className="text-xs text-muted-foreground">{item.product.description}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {isPendingSO ? item.quantity : (item.quantity_ordered || item.quantity)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.product?.weight ? (
                                            <span>
                                                {(item.product.weight * (isPendingSO ? item.quantity : (item.quantity_shipped || item.quantity_delivered || item.quantity_ordered || 0))).toFixed(2)}
                                                <span className="text-xs text-muted-foreground block">(@{item.product.weight})</span>
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                    {!isPendingSO && (
                                        <TableCell className="text-right">
                                            {item.quantity_shipped || item.quantity_delivered || 0}
                                        </TableCell>
                                    )}
                                    <TableCell>{item.location_code || item.product?.location_code || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No items found
                                    </TableCell>
                                </TableRow>
                            )}
                            {items.length > 0 && totalWeight > 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Weight:</TableCell>
                                    <TableCell className="text-right font-bold">{totalWeight.toFixed(2)} kg</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>


                <DialogFooter>
                    <SuperAdminActions
                        type="delivery_order"
                        id={order.id}
                        currentStatus={order.status}
                        onSuccess={() => {
                            onClose();
                            // Ideally trigger refresh in parent, but onClose is enough for now
                            // The parent might need to pass a refresh callback
                            window.location.reload(); // Simple brute force refresh for admin action
                        }}
                    />
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
};

export default DeliveryOrderDetailsModal;
