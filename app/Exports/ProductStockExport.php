<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProductStockExport implements FromCollection, WithHeadings, WithMapping
{
    protected $stocks;

    public function __construct($stocks)
    {
        $this->stocks = $stocks;
    }

    public function collection()
    {
        return $this->stocks;
    }

    public function headings(): array
    {
        return [
            'Warehouse Name',
            'Bin Location',
            'SKU',
            'Product Name',
            'Category',
            'Physical Qty (On Hand)',
            'Reserved Qty',
            'Available Qty',
            'Weight (kg)',
            'Buy Price',
            'Total Asset Value'
        ];
    }

    public function map($stock): array
    {
        $buyPrice = $stock->product->buy_price ?? 0;
        $totalAssetValue = $stock->quantity * $buyPrice;

        return [
            $stock->warehouse->name ?? 'N/A',
            $stock->bin_location ?? '-',
            $stock->product->sku ?? 'N/A',
            $stock->product->name ?? 'N/A',
            $stock->product->category->name ?? 'Uncategorized',
            $stock->quantity,
            $stock->reserved_quantity,
            $stock->available_quantity,
            $stock->product->weight ?? 0,
            $buyPrice,
            $totalAssetValue
        ];
    }
}
