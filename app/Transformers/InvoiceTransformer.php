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
        $invoice->load(['salesOrder', 'customer', 'invoiceItems.product', 'invoiceItems.salesOrderItem.salesOrder']);

        // Prepare items data and track SOs/POs
        $items = [];
        $soNumbers = [];
        $poNumbers = [];

        foreach ($invoice->invoiceItems as $item) {
            $soNumber = $item->salesOrderItem->salesOrder->sales_order_number ?? $invoice->salesOrder->sales_order_number ?? 'N/A';
            $poNumber = $item->salesOrderItem->salesOrder->po_number ?? $invoice->salesOrder->po_number ?? '-';

            $soNumbers[$soNumber] = true;
            if ($poNumber !== '-' && !empty($poNumber)) {
                $poNumbers[$poNumber] = true;
            }

            $items[] = [
                'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                'description' => $item->product->name ?? $item->product->description ?? $item->description ?? 'No description',
                'qty' => $item->quantity,
                'unit_price' => $item->unit_price,
                'disc' => $item->discount_percentage ?? 0,
                'tax_rate' => $item->tax_rate,
                'total_price' => $item->total_price / (1 + ($item->tax_rate / 100)), // Changed to tax-exclusive for table display
                'so_number' => $soNumber,
                'po_number' => $poNumber
            ];
        }

        // Determine Header SO and PO (Multiple if consolidated)
        $displaySoNumber = count($soNumbers) > 1 ? 'CONSOLIDATED' : (array_keys($soNumbers)[0] ?? 'N/A');
        $displayPoNumber = count($poNumbers) > 1 ? 'Multiple' : (array_keys($poNumbers)[0] ?? '-');

        // Group items by SO for PDF grouping support
        $itemsGrouped = collect($items)->groupBy('so_number')->map(function ($items, $soNumber) {
            $firstItem = $items->first();
            // Fetch quotation number from the sales order of the first item in the group
            $so = \App\Models\SalesOrder::with('quotation')->where('sales_order_number', $soNumber)->first();

            return [
                'so_number' => $soNumber,
                'quotation_no' => $so->quotation->quotation_number ?? '-',
                'po_number' => $firstItem['po_number'] ?? '-',
                'group_total' => $items->sum('total_price'), // Now correctly reflects sum of exclusive prices
                'items' => $items->toArray()
            ];
        })->values()->toArray();

        // Calculate totals
        $totalTax = 0;
        foreach ($invoice->invoiceItems as $item) {
            if ($item->tax_rate > 0) {
                // Calculate tax component from inclusive price
                $taxComponent = $item->total_price - ($item->total_price / (1 + ($item->tax_rate / 100)));
                $totalTax += $taxComponent;
            }
        }

        $grandTotal = $invoice->total_amount;
        $subtotal = $grandTotal - $totalTax;

        return [
            'invoice_no' => $invoice->invoice_number,
            'quotation_no' => $invoice->salesOrder->quotation->quotation_number ?? 'N/A',
            'delivery_no' => $invoice->deliveryOrder->delivery_order_number ?? 'N/A',
            'sales_order_no' => $displaySoNumber,
            'po_number' => $displayPoNumber,
            'date' => \Carbon\Carbon::parse($invoice->issue_date)->format('d M Y'),
            'customer_name' => $invoice->customer->company_name ?? $invoice->customer->name ?? 'N/A',
            'customer_address' => $invoice->customer->address ?? 'N/A',
            'items' => $items,
            'items_grouped' => $itemsGrouped,
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