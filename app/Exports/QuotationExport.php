<?php

namespace App\Exports;

use App\Models\Quotation;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class QuotationExport implements FromCollection, WithHeadings, WithStyles, WithTitle
{
    protected $quotation;

    public function __construct(Quotation $quotation)
    {
        $this->quotation = $quotation;
    }

    public function collection()
    {
        $data = [];

        // Header information
        $data[] = ['PT. JINAN TEKNIK - QUOTATION'];
        $data[] = ['Quotation Number:', $this->quotation->quotation_number];
        $data[] = ['Date:', date('d M Y', strtotime($this->quotation->created_at))];
        $data[] = ['Status:', $this->quotation->status];
        $data[] = ['Valid Until:', date('d M Y', strtotime($this->quotation->valid_until))];
        $data[] = [''];

        // Customer information
        $data[] = ['CUSTOMER INFORMATION'];
        $data[] = ['Company Name:', $this->quotation->customer->company_name];
        $data[] = ['Contact Person:', $this->quotation->customer->contact_person];
        $data[] = ['Address:', $this->quotation->customer->address];
        $data[] = ['Phone:', $this->quotation->customer->phone];
        $data[] = ['Email:', $this->quotation->customer->email];
        $data[] = ['Tax ID:', $this->quotation->customer->tax_id];
        $data[] = [''];

        // Items table header
        $data[] = ['QUOTATION ITEMS'];
        $data[] = [
            'No',
            'Product Code',
            'Product Name',
            'Description',
            'Quantity',
            'Unit Price',
            'Discount %',
            'Tax %',
            'Total Price'
        ];

        // Items data
        foreach ($this->quotation->quotationItems as $index => $item) {
            $data[] = [
                $index + 1,
                $item->product->sku,
                $item->product->name,
                $item->product->description,
                $item->quantity,
                $item->unit_price,
                $item->discount_percentage,
                $item->tax_rate,
                $item->total_price
            ];
        }

        $data[] = [''];

        // Totals
        $data[] = ['SUMMARY'];
        $data[] = ['Subtotal:', '', '', '', '', '', '', '', $this->quotation->subtotal];
        $data[] = ['Discount:', '', '', '', '', '', '', '', $this->quotation->discount];
        $data[] = ['Tax:', '', '', '', '', '', '', '', $this->quotation->tax];
        $data[] = ['TOTAL AMOUNT:', '', '', '', '', '', '', '', $this->quotation->total_amount];

        if ($this->quotation->notes) {
            $data[] = [''];
            $data[] = ['NOTES'];
            $data[] = [$this->quotation->notes];
        }

        return collect($data);
    }

    public function headings(): array
    {
        // This method is required by WithHeadings interface but we handle headers in collection()
        return [];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Style the header row
            1 => [
                'font' => [
                    'bold' => true,
                    'size' => 16,
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                ],
            ],

            // Style section headers
            8 => ['font' => ['bold' => true]],
            15 => ['font' => ['bold' => true]],

            // Style table header
            16 => [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E6E6E6'],
                ],
            ],

            // Style totals section
            25 => ['font' => ['bold' => true]],
            29 => [
                'font' => [
                    'bold' => true,
                    'size' => 14,
                ],
            ],

            // Style notes section if exists
            31 => ['font' => ['bold' => true]],
        ];
    }

    public function title(): string
    {
        return 'Quotation ' . $this->quotation->quotation_number;
    }
}