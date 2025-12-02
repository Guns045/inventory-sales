import React, { useEffect } from 'react';
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

const schema = z.object({
    customer_id: z.string().min(1, "Customer is required"),
    warehouse_id: z.string().min(1, "Warehouse is required"),
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED']),
    valid_until: z.string().min(1, "Valid until date is required"),
});

export function QuotationForm({
    initialData,
    customers = [],
    warehouses = [],
    products = [],
    onSubmit,
    onCancel,
    onSearchProducts,
    loading = false
}) {
    const { register, handleSubmit, errors, setValue, watch } = useForm(schema, {
        defaultValues: {
            customer_id: initialData?.customer_id?.toString() || '',
            warehouse_id: initialData?.warehouse_id?.toString() || '',
            status: initialData?.status || 'DRAFT',
            valid_until: initialData?.valid_until ? initialData.valid_until.split('T')[0] : '',
        }
    });

    // Register custom form fields
    useEffect(() => {
        register('customer_id');
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

    // Load initial items
    useEffect(() => {
        if (initialData?.items && initialData.items.length > 0) {
            const mappedItems = initialData.items.map(item => ({
                ...item,
                product_id: item.product_id,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                discount_percentage: Number(item.discount_percentage || 0),
                tax_rate: Number(item.tax_rate || 0)
            }));
            setItems(mappedItems);
        }
    }, [initialData, setItems]);

    const onFormSubmit = async (data) => {
        if (items.length === 0) {
            // You might want to use a toast here instead of alert in a real app
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
    const customerId = watch('customer_id');
    const warehouseId = watch('warehouse_id');

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{initialData ? 'Edit Quotation' : 'New Quotation'}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer_id">Customer</Label>
                            <Select
                                value={customerId}
                                onValueChange={(value) => setValue('customer_id', value, { shouldValidate: true })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.company_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.customer_id && <p className="text-sm text-red-500">{errors.customer_id.message}</p>}
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
                                onValueChange={(value) => setValue('status', value, { shouldValidate: true })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="valid_until">Valid Until</Label>
                            <Input
                                type="date"
                                {...register('valid_until')}
                            />
                            {errors.valid_until && <p className="text-sm text-red-500">{errors.valid_until.message}</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Line Items</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[500px]">
                    <LineItemsTable
                        items={items}
                        products={products}
                        onAdd={addItem}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                        onSearch={onSearchProducts}
                        editable={true}
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
                    {loading ? 'Saving...' : (initialData ? 'Update Quotation' : 'Create Quotation')}
                </Button>
            </div>
        </form>
    );
}
