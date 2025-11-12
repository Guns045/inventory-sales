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
        // Prepare items data
        $items = [];

        // Use delivery order items if available, otherwise use sales order items
        if ($deliveryOrder->deliveryOrderItems && $deliveryOrder->deliveryOrderItems->isNotEmpty()) {
            foreach ($deliveryOrder->deliveryOrderItems as $item) {
                $items[] = [
                    'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                    'description' => $item->product->description ?? $item->description ?? 'No description',
                    'quantity' => $item->quantity,
                    'po_number' => 'N/A', // Default since po_number removed
                    'delivery_method' => 'Truck', // Default internal delivery
                    'delivery_vendor' => 'Internal' // Default internal vendor
                ];
            }
        } elseif ($deliveryOrder->salesOrder && $deliveryOrder->salesOrder->salesOrderItems) {
            foreach ($deliveryOrder->salesOrder->salesOrderItems as $item) {
                $items[] = [
                    'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                    'description' => $item->product->description ?? $item->description ?? 'No description',
                    'quantity' => $item->quantity,
                    'po_number' => 'N/A', // Default since po_number removed
                    'delivery_method' => 'Truck', // Default internal delivery
                    'delivery_vendor' => 'Internal' // Default internal vendor
                ];
            }
        }

        return [
            'sales_order_no' => $deliveryOrder->salesOrder ? $deliveryOrder->salesOrder->sales_order_number : 'N/A', // ✅ Ganti Quotation No → Sales Order No
            'delivery_no' => $deliveryOrder->delivery_order_number,
            'customer_name' => $deliveryOrder->customer->name,
            'customer_id' => $deliveryOrder->customer->customer_code ?? 'CUST-' . $deliveryOrder->customer->id,
            'customer_address' => $deliveryOrder->shipping_address ?? $deliveryOrder->customer->address ?? 'No address provided',
            'date' => \Carbon\Carbon::parse($deliveryOrder->shipping_date ?? $deliveryOrder->created_at)->format('d M Y'),
            'driver_name' => $deliveryOrder->driver_name ?? 'N/A',
            'vehicle_plate' => $deliveryOrder->vehicle_plate_number ?? 'N/A',
            'contact_person' => $deliveryOrder->shipping_contact_person ?? ($deliveryOrder->customer->contact_person ?? 'N/A'),
            'items' => $items,
            'notes' => $deliveryOrder->notes ?? '',
            'status' => $deliveryOrder->status ?? 'PREPARING'
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