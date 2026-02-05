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
        $deliveryOrder->load(['deliveryOrderItems.product', 'deliveryOrderItems.salesOrderItem.salesOrder', 'customer']);

        // Prepare items data
        $items = [];
        $totalWeight = 0;
        foreach ($deliveryOrder->deliveryOrderItems as $item) {
            $weight = $item->product->weight ?? 0;
            $itemTotalWeight = $weight * $item->quantity_shipped;
            $totalWeight += $itemTotalWeight;

            // Get SO details from the item itself if available (for consolidated DOs)
            $itemSO = $item->salesOrderItem->salesOrder ?? $deliveryOrder->salesOrder;

            $items[] = [
                'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                'description' => $item->product->name ?? $item->product->description ?? $item->description ?? 'No description',
                'quantity' => $item->quantity_shipped,
                'weight' => $weight,
                'total_weight' => $itemTotalWeight,
                'so_number' => $itemSO->sales_order_number ?? '-',
                'po_number' => $itemSO->po_number ?? '-',
                'delivery_method' => $deliveryOrder->delivery_method ?? 'Truck',
                'delivery_vendor' => $deliveryOrder->delivery_vendor ?? 'Internal'
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

        $uniqueSOs = collect($items)->pluck('so_number')->unique()->filter(fn($v) => $v !== '-');
        $isConsolidated = $uniqueSOs->count() > 1;

        // Group items by SO
        $itemsGrouped = collect($items)->groupBy('so_number')->map(function ($items, $soNumber) {
            return [
                'so_number' => $soNumber,
                'po_number' => $items->first()['po_number'] ?? '-',
                'items' => $items->toArray()
            ];
        })->values()->toArray();

        return [
            'delivery_no' => $deliveryOrder->delivery_order_number,
            'sales_order_no' => $isConsolidated ? 'CONSOLIDATED' : ($deliveryOrder->salesOrder ? $deliveryOrder->salesOrder->sales_order_number : 'N/A'),
            'customer_name' => $customerName,
            'customer_id' => $customerId,
            'po_number' => $isConsolidated ? 'Multiple' : ($deliveryOrder->salesOrder->po_number ?? null),
            'customer_address' => $customerAddress,
            'date' => \Carbon\Carbon::parse($deliveryOrder->shipping_date ?? $deliveryOrder->created_at)->format('d M Y'),
            'driver_name' => $deliveryOrder->driver_name ?? 'N/A',
            'vehicle_plate' => $deliveryOrder->vehicle_plate_number ?? 'N/A',
            'delivery_method' => $deliveryOrder->delivery_method ?? 'Truck',
            'delivery_vendor' => $deliveryOrder->delivery_vendor ?? 'Internal',
            'tracking_number' => $deliveryOrder->tracking_number ?? '-',
            'contact_person' => $contactPerson,
            'recipient_name' => $deliveryOrder->recipient_name ?? '_____________________',
            'recipient_title' => $deliveryOrder->recipient_title ?? '_____________________',
            'items' => $items,
            'items_grouped' => $itemsGrouped,
            'total_weight' => $totalWeight,
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
        // Prepare items data
        $items = [];
        $totalWeight = 0;

        foreach ($transfer->items as $item) {
            $weight = $item->product?->weight ?? 0;
            $quantity = $item->quantity_delivered ?? $item->quantity_requested;
            $itemTotalWeight = $weight * $quantity;
            $totalWeight += $itemTotalWeight;

            $items[] = [
                'part_number' => $item->product?->sku ?? $item->product?->part_number ?? '-',
                'description' => $item->product?->name ?? $item->product?->description ?? '-',
                'quantity' => $quantity,
                'weight' => $weight,
                'total_weight' => $itemTotalWeight,
                'from_location' => $item->product?->location ?? $transfer->warehouseFrom->name ?? '-',
                'to_location' => $item->product?->location ?? $transfer->warehouseTo->name ?? '-'
            ];
        }

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
            'total_weight' => $totalWeight,
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