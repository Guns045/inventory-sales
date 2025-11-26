<?php

namespace App\Transformers;

use App\Models\DeliveryOrder;

class DeliveryOrderTransformer
{
    /**
     * Transform DeliveryOrder model ke array structure untuk template PDF
     */
    public static function transform(DeliveryOrder $deliveryOrder): array
    {
        // Load relationships
        $deliveryOrder->load(['salesOrder.customer', 'deliveryOrderItems.product', 'customer']);

        // Prepare items data
        $items = [];
        foreach ($deliveryOrder->deliveryOrderItems as $item) {
            $items[] = [
                'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                'description' => $item->product->description ?? $item->description ?? 'No description',
                'quantity' => $item->quantity_shipped,
                'po_number' => 'N/A', // Default since po_number removed
                'delivery_method' => 'Truck', // Default internal delivery
                'delivery_vendor' => 'Internal' // Default internal vendor
            ];
        }

        $customerName = 'N/A';
        $customerId = 'N/A';
        $customerAddress = 'No address provided';
        $contactPerson = 'N/A';

        if ($deliveryOrder->customer) {
            $customerName = $deliveryOrder->customer->company_name ?? $deliveryOrder->customer->name ?? 'N/A';
            $customerId = 'CUST-' . $deliveryOrder->customer->id;
            $customerAddress = $deliveryOrder->shipping_address ?? $deliveryOrder->customer->address ?? 'No address provided';
            $contactPerson = $deliveryOrder->shipping_contact_person ?? ($deliveryOrder->customer->contact_person ?? 'N/A');
        }

        return [
            'delivery_no' => $deliveryOrder->delivery_order_number,
            'sales_order_no' => $deliveryOrder->salesOrder ? $deliveryOrder->salesOrder->sales_order_number : 'N/A',
            'customer_name' => $customerName,
            'customer_id' => $customerId,
            'customer_address' => $customerAddress,
            'date' => \Carbon\Carbon::parse($deliveryOrder->shipping_date ?? $deliveryOrder->created_at)->format('d M Y'),
            'driver_name' => $deliveryOrder->driver_name ?? 'N/A',
            'vehicle_plate' => $deliveryOrder->vehicle_plate_number ?? 'N/A',
            'contact_person' => $contactPerson,
            'recipient_name' => $deliveryOrder->recipient_name ?? '_____________________',
            'recipient_title' => $deliveryOrder->recipient_title ?? '_____________________',
            'items' => $items,
            'notes' => $deliveryOrder->notes ?? '',
            'status' => $deliveryOrder->status ?? 'PREPARING'
        ];
    }

    /**
     * Transform WarehouseTransfer untuk Delivery Order (Internal Transfer)
     */
    public static function transformFromWarehouseTransfer(\App\Models\WarehouseTransfer $transfer, ?DeliveryOrder $deliveryOrder = null): array
    {
        $deliveryOrderNumber = $deliveryOrder ? $deliveryOrder->delivery_order_number : $transfer->transfer_number;

        // Prepare items data
        $items = [];
        $items[] = [
            'part_number' => $transfer->product->sku ?? $transfer->product->part_number ?? '-',
            'description' => $transfer->product->description ?? '-',
            'quantity' => $transfer->quantity_delivered ?? $transfer->quantity_requested,
            'from_location' => $transfer->product->location ?? $transfer->warehouseFrom->name ?? '-',
            'to_location' => $transfer->product->location ?? $transfer->warehouseTo->name ?? '-'
        ];

        return [
            'delivery_no' => $deliveryOrderNumber,
            'transfer_no' => $transfer->transfer_number,
            'from_warehouse' => $transfer->warehouseFrom->name,
            'to_warehouse' => $transfer->warehouseTo->name,
            'date' => $deliveryOrder ? \Carbon\Carbon::parse($deliveryOrder->created_at)->format('d M Y') : date('d M Y'),
            'driver_name' => $deliveryOrder->driver_name ?? 'Internal Transfer Driver',
            'vehicle_plate' => $deliveryOrder->vehicle_plate_number ?? 'Internal Vehicle',
            'contact_person' => 'Warehouse Staff',
            'recipient_name' => $deliveryOrder->recipient_name ?? null,
            'recipient_title' => $deliveryOrder->recipient_title ?? null,
            'items' => $items,
            'notes' => "Internal Transfer: " . $transfer->transfer_number,
            'status' => $deliveryOrder->status ?? 'IN_TRANSIT'
        ];
    }

    /**
     * Get company data untuk template
     */
    public static function getCompanyData(): array
    {
        $company = \App\Models\CompanySettings::getActive();

        return [
            'name' => $company->company_name ?? 'PT. Jinan Truck Power Indonesia',
            'address' => $company->company_address ?? 'Jl. Raya Bogor Km. 29, Cibinong, Bogor'
        ];
    }
}