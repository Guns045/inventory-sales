<?php

namespace App\Exports;

use App\Models\SalesOrder;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Illuminate\Support\Collection;

class SalesOrderExport implements FromCollection, WithHeadings, WithMapping
{
    protected $salesOrders;

    public function __construct($salesOrders)
    {
        $this->salesOrders = $salesOrders;
    }

    public function collection()
    {
        return $this->salesOrders;
    }

    public function headings(): array
    {
        return [
            'SO Number',
            'Date',
            'Customer Name',
            'Warehouse',
            'Status',
            'Payment Status',
            'Total Amount',
            'Created By',
            'Item SKU',
            'Item Name',
            'Quantity',
            'Unit Price',
            'Subtotal'
        ];
    }

    public function map($salesOrder): array
    {
        $rows = [];

        foreach ($salesOrder->items as $item) {
            $rows[] = [
                $salesOrder->sales_order_number,
                $salesOrder->created_at->format('Y-m-d H:i'),
                $salesOrder->customer->company_name ?? 'N/A',
                $salesOrder->warehouse->name ?? 'N/A',
                $salesOrder->status,
                $salesOrder->payment_status,
                $salesOrder->total_amount,
                $salesOrder->user->name ?? 'N/A',
                $item->product->sku ?? 'N/A',
                $item->product->name ?? 'N/A',
                $item->quantity,
                $item->unit_price,
                $item->subtotal
            ];
        }

        // If no items, still return one row with empty item details
        if ($salesOrder->items->isEmpty()) {
            $rows[] = [
                $salesOrder->sales_order_number,
                $salesOrder->created_at->format('Y-m-d H:i'),
                $salesOrder->customer->company_name ?? 'N/A',
                $salesOrder->warehouse->name ?? 'N/A',
                $salesOrder->status,
                $salesOrder->payment_status,
                $salesOrder->total_amount,
                $salesOrder->user->name ?? 'N/A',
                '',
                '',
                0,
                0,
                0
            ];
        }

        return $rows;
    }
}
