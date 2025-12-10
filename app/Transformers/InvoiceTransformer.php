<?php

namespace App\Transformers;

use App\Models\Invoice;

class InvoiceTransformer
{
    /**
     * Transform Invoice model ke array structure untuk template PDF
     */
    public static function transform(Invoice $invoice): array
    {
        // Load relationships eagerly to avoid N+1 queries
        $invoice->load(['salesOrder', 'customer', 'invoiceItems.product']);

        // Prepare items data
        $items = [];

        foreach ($invoice->invoiceItems as $item) {
            $items[] = [
                'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                'description' => $item->product->name ?? $item->product->description ?? $item->description ?? 'No description',
                'qty' => $item->quantity,
                'unit_price' => $item->unit_price,
                'disc' => $item->discount_percentage ?? 0,
                'total_price' => $item->total_price
            ];
        }

        // Calculate totals
        $totalTax = 0;
        $subtotal = 0;

        foreach ($invoice->invoiceItems as $item) {
            if ($item->tax_rate > 0) {
                // Calculate tax component from inclusive price
                // Formula: Tax = Total - (Total / (1 + TaxRate/100))
                $taxComponent = $item->total_price - ($item->total_price / (1 + ($item->tax_rate / 100)));
                $totalTax += $taxComponent;
            }
        }

        // Since total_amount in DB is already Grand Total (inclusive)
        $grandTotal = $invoice->total_amount;
        $subtotal = $grandTotal - $totalTax;

        return [
            'invoice_no' => $invoice->invoice_number,
            'quotation_no' => $invoice->salesOrder->quotation->quotation_number ?? 'N/A',
            'po_number' => $invoice->salesOrder->po_number ?? '-',
            'date' => \Carbon\Carbon::parse($invoice->issue_date)->format('d M Y'),
            'customer_name' => $invoice->customer->company_name ?? $invoice->customer->name ?? 'N/A',
            'customer_address' => $invoice->customer->address ?? 'N/A',
            'items' => $items,
            'total' => $subtotal, // Subtotal (Before Tax)
            'tax' => $totalTax,
            'grand_total' => $grandTotal, // Grand Total (Inclusive)
            'notes' => $invoice->notes ?? ''
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