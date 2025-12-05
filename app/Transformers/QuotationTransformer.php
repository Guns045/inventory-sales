<?php

namespace App\Transformers;

use App\Models\Quotation;

class QuotationTransformer
{
    /**
     * Transform Quotation model ke array structure untuk template PDF
     */
    public static function transform(Quotation $quotation): array
    {
        // Calculate totals
        $subtotal = 0;
        $taxAmount = 0;
        $items = [];

        foreach ($quotation->quotationItems as $item) {
            $itemTotal = $item->quantity * $item->unit_price;
            $discountAmount = ($item->discount_percentage / 100) * $itemTotal;
            $taxableAmount = $itemTotal - $discountAmount;
            $itemTaxAmount = ($item->tax_rate / 100) * $taxableAmount;
            $finalTotal = $taxableAmount + $itemTaxAmount;

            $subtotal += $taxableAmount; // Subtotal excludes tax
            $taxAmount += $itemTaxAmount; // Accumulate tax

            $items[] = [
                'part_number' => $item->product->sku ?? $item->product_code ?? 'N/A',
                'description' => $item->product->name ?? $item->product->description ?? $item->description ?? 'No description',
                'qty' => $item->quantity,
                'unit_price' => $item->unit_price,
                'disc' => $item->discount_percentage,
                'total_price' => $finalTotal
            ];
        }

        // Calculate grand total
        $otherCosts = $quotation->other_costs ?? 0;
        $grandTotal = $subtotal + $taxAmount + $otherCosts;

        // Get warehouse name for Franco
        $warehouseName = 'Jakarta'; // Default
        if ($quotation->warehouse_id) {
            $warehouse = $quotation->warehouse;
            $warehouseName = $warehouse ? $warehouse->name : 'Jakarta';
        } elseif ($quotation->user && $quotation->user->warehouse_id) {
            $warehouse = $quotation->user->warehouse;
            $warehouseName = $warehouse ? $warehouse->name : 'Jakarta';
        }

        return [
            'number' => $quotation->quotation_number,
            'date' => \Carbon\Carbon::parse($quotation->quotation_date ?? $quotation->created_at)->format('d M Y'),
            'customer_name' => $quotation->customer->company_name ?? $quotation->customer->name,
            'customer_id' => $quotation->customer->customer_code ?? 'CUST-' . $quotation->customer->id,
            'customer_address' => $quotation->customer->address ?? 'No address provided',
            'franco' => $warehouseName, // ✅ Pake warehouse_id dengan fallback
            'items' => $items,
            'total' => $subtotal,
            'tax' => $taxAmount,
            'grand_total' => $grandTotal,
            'valid_until' => \Carbon\Carbon::parse($quotation->valid_until ?? $quotation->created_at)->format('d M Y'),
            'sales_person' => $quotation->user->name ?? 'Sales',
            'po_number' => $quotation->po_number,
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