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

        foreach ($pickingList->items as $index => $item) {
            $items[] = [
                'no' => $index + 1,
                'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                'description' => $item->product->name ?? $item->product->description ?? $item->description ?? 'No description',
                'qty' => $item->quantity_required,
                'location' => $item->location_code ?? $item->product->location ?? 'A-01-01',
                'picked_qty' => $item->quantity_picked ?? $item->quantity_required,
                'status' => $item->quantity_picked >= $item->quantity_required ? 'COMPLETED' : 'PENDING'
            ];
        }

        // Determine source (SO or IT)
        $processNumber = 'N/A';
        if ($pickingList->salesOrder) {
            $processNumber = $pickingList->salesOrder->sales_order_number;
        }

        // Get warehouse info from picking list, sales order, or items
        $warehouseName = 'Main Warehouse';
        if ($pickingList->warehouse) {
            $warehouseName = $pickingList->warehouse->name;
        } elseif ($pickingList->salesOrder && $pickingList->salesOrder->warehouse) {
            $warehouseName = $pickingList->salesOrder->warehouse->name;
        } elseif ($pickingList->items->first() && $pickingList->items->first()->warehouse) {
            $warehouseName = $pickingList->items->first()->warehouse->name;
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
            'notes' => $pickingList->notes ?? '',
            'customer_name' => $pickingList->salesOrder->customer->company_name ?? $pickingList->salesOrder->customer->name ?? 'N/A'
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
            // Get warehouse ID from sales order (not from user)
            $warehouseId = $salesOrder->warehouse_id;
            $pickingListNumber = \App\Models\DocumentCounter::getNextNumber('PICKING_LIST', $warehouseId);
        } catch (\Exception $e) {
            // Fallback manual number generation if DocumentCounter fails
            $pickingListNumber = 'PL-' . date('ymd') . '-' . str_pad((string) mt_rand(1, 999), 3, '0', STR_PAD_LEFT);
        }

        // Prepare items data
        $items = [];
        foreach ($salesOrder->items as $index => $item) {
            $items[] = [
                'no' => $index + 1,
                'part_number' => $item->product->part_number ?? $item->product->code ?? $item->product->sku ?? 'N/A',
                'description' => $item->product->name ?? $item->product->description ?? 'No Description',
                'qty' => $item->quantity,
                'unit' => $item->product->unit ?? 'pcs',
                'location' => $item->product->location ?? '-',
                'notes' => null
            ];
        }

        // Get warehouse name from sales order
        $warehouseName = 'Main Warehouse';
        if ($salesOrder->warehouse) {
            $warehouseName = $salesOrder->warehouse->name;
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
     * Transform WarehouseTransfer untuk picking list
     */
    public static function transformFromWarehouseTransfer(\App\Models\WarehouseTransfer $transfer, ?string $existingNumber = null): array
    {
        // Use existing number if provided, otherwise generate new one
        if ($existingNumber) {
            $pickingListNumber = $existingNumber;
        } else {
            // Generate picking list number using DocumentCounter
            try {
                $warehouseId = $transfer->warehouse_from_id;
                \Illuminate\Support\Facades\Log::info('Generating Picking List for Transfer', [
                    'transfer_id' => $transfer->id,
                    'warehouse_from_id' => $warehouseId,
                    'transfer_number' => $transfer->transfer_number
                ]);
                $pickingListNumber = \App\Models\DocumentCounter::getNextNumber('PICKING_LIST', $warehouseId);
            } catch (\Exception $e) {
                // Fallback manual number generation
                $pickingListNumber = 'PL-' . date('ymd') . '-' . str_pad((string) mt_rand(1, 999), 3, '0', STR_PAD_LEFT);
            }
        }

        // Fetch ProductStock for bin location
        $productStock = \App\Models\ProductStock::where('product_id', $transfer->product_id)
            ->where('warehouse_id', $transfer->warehouse_from_id)
            ->first();

        $location = $productStock->bin_location ?? $transfer->product->location ?? '-';

        // Prepare items data
        $items = [];
        $items[] = [
            'no' => 1,
            'part_number' => $transfer->product->sku ?? $transfer->product->part_number ?? '-',
            'description' => $transfer->product->name ?? $transfer->product->description ?? '-',
            'qty' => $transfer->quantity_requested,
            'unit' => $transfer->product->unit ?? 'pcs',
            'location' => $location,
            'from_location' => $location,
            'to_location' => $transfer->warehouseTo->name ?? '-',
            'notes' => "Transfer from " . $transfer->warehouseFrom->name . " to " . $transfer->warehouseTo->name
        ];

        return [
            'PL' => $pickingListNumber,
            'IT/SO' => $transfer->transfer_number,
            'warehouse' => $transfer->warehouseFrom->name,
            'to_warehouse' => $transfer->warehouseTo->name,
            'date' => date('d M Y'),
            'status' => 'PENDING',
            'priority' => 'NORMAL',
            'target_time' => '16:00',
            'picker' => auth()->user()->name ?? 'Warehouse Staff',
            'items' => $items,
            'notes' => "Internal Transfer: " . $transfer->transfer_number,
            'customer_name' => 'Internal Transfer'
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