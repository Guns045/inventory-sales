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