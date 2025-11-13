<?php

namespace App\Transformers;

use App\Models\PickingList;

class PickingListTransformer
{
    /**
     * Transform PickingList model ke array structure untuk template PDF
     */
    public static function transform(PickingList $pickingList): array
    {
        // Load relationships eagerly to avoid N+1 queries
        $pickingList->load(['salesOrder.customer', 'items.product', 'user']);

        // Prepare items data
        $items = [];

        foreach ($pickingList->items as $item) {
            $items[] = [
                'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                'description' => $item->product->description ?? $item->description ?? 'No description',
                'qty' => $item->quantity,
                'location' => $item->product->warehouse_location ?? $item->location ?? 'A-01-01',
                'picked_qty' => $item->picked_quantity ?? $item->quantity,
                'status' => $item->picked_quantity >= $item->quantity ? 'COMPLETED' : 'PENDING'
            ];
        }

        // Determine source (SO or IT)
        $processNumber = 'N/A';
        if ($pickingList->salesOrder) {
            $processNumber = $pickingList->salesOrder->sales_order_number;
        }

        // Get warehouse info from items or sales order
        $warehouseName = 'Main Warehouse';
        if ($pickingList->items->first() && $pickingList->items->first()->warehouse) {
            $warehouseName = $pickingList->items->first()->warehouse->name;
        } elseif ($pickingList->salesOrder && $pickingList->salesOrder->warehouse) {
            $warehouseName = $pickingList->salesOrder->warehouse->name;
        }

        return [
            'PL' => $pickingList->picking_list_number,
            'IT/SO' => $processNumber,
            'warehouse' => $warehouseName,
            'date' => \Carbon\Carbon::parse($pickingList->picked_at ?? $pickingList->created_at)->format('d M Y'),
            'status' => $pickingList->status ?? 'PENDING',
            'priority' => $pickingList->priority ?? 'NORMAL',
            'target_time' => $pickingList->target_time ?? '16:00',
            'picker' => $pickingList->user->name ?? 'Warehouse Staff',
            'items' => $items,
            'notes' => $pickingList->notes ?? ''
        ];
    }

    /**
     * Transform SalesOrder langsung untuk picking list (tanpa create PickingList record)
     * Like Quotation approach - simple & clean
     */
    public static function transformFromSalesOrder(\App\Models\SalesOrder $salesOrder): array
    {
        // Generate picking list number using DocumentCounter (proper format)
        try {
            // Get warehouse ID from sales order user
            $warehouseId = $salesOrder->user->warehouse_id ?? null;
            $pickingListNumber = \App\Models\DocumentCounter::getNextNumber('PICKING_LIST', $warehouseId);
        } catch (\Exception $e) {
            // Fallback manual number generation if DocumentCounter fails
            $pickingListNumber = 'PL-' . date('ymd') . '-' . str_pad((string)mt_rand(1, 999), 3, '0', STR_PAD_LEFT);
        }

        // Prepare items data
        $items = [];
        foreach ($salesOrder->items as $index => $item) {
            $items[] = [
                'no' => $index + 1,
                'part_number' => $item->product->part_number ?? $item->product->code ?? $item->product->sku ?? 'N/A',
                'description' => $item->product->description ?? 'No Description',
                'qty' => $item->quantity,
                'unit' => $item->product->unit ?? 'pcs',
                'location' => $item->product->location ?? '-',
                'notes' => null
            ];
        }

        // Get warehouse name from user
        $warehouseName = 'Main Warehouse';
        if ($salesOrder->user && $salesOrder->user->warehouse) {
            $warehouseName = $salesOrder->user->warehouse->name;
        }

        $result = [
            'PL' => $pickingListNumber,
            'IT/SO' => $salesOrder->sales_order_number,
            'warehouse' => $warehouseName,
            'date' => date('d M Y'),
            'status' => 'PENDING',
            'priority' => 'NORMAL',
            'target_time' => '16:00',
            'picker' => auth()->user()->name ?? 'Warehouse Staff',
            'items' => $items,
            'notes' => null,
            'customer_name' => $salesOrder->customer->company_name ?? $salesOrder->customer->name ?? 'N/A'
        ];

        // Debug: log the result
        \Log::info('PickingList transform result', ['result' => $result]);

        return $result;
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