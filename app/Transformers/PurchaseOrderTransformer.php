<?php

namespace App\Transformers;

use App\Models\PurchaseOrder;

class PurchaseOrderTransformer
{
    /**
     * Transform PurchaseOrder model ke array structure untuk template PDF
     */
    public static function transform(PurchaseOrder $purchaseOrder): array
    {
        // Calculate totals
        $subtotal = 0;
        $items = [];

        foreach ($purchaseOrder->items as $item) {
            $itemTotal = $item->quantity_ordered * $item->unit_price;
            $subtotal += $itemTotal;

            $items[] = [
                'part_number' => $item->product->part_number ?? $item->product->sku ?? $item->product->code ?? 'N/A',
                'description' => $item->product->description ?? $item->product->name ?? 'No description',
                'qty' => $item->quantity_ordered,
                'unit_price' => $item->unit_price,
                'total_price' => $itemTotal
            ];
        }

        // Calculate tax (PPN 11%) and grand total
        $taxRate = 11; // PPN 11%
        $taxAmount = ($taxRate / 100) * $subtotal;
        $grandTotal = $subtotal + $taxAmount;

        return [
            'number' => $purchaseOrder->po_number,
            'date' => \Carbon\Carbon::parse($purchaseOrder->order_date ?? $purchaseOrder->created_at)->format('d M Y'),
            'supplier_name' => $purchaseOrder->supplier->name,
            'supplier_address' => $purchaseOrder->supplier->address ?? 'No address provided',
            'warehouse' => $purchaseOrder->warehouse->name ?? 'Main Warehouse',
            'expected_delivery' => $purchaseOrder->expected_delivery_date ? \Carbon\Carbon::parse($purchaseOrder->expected_delivery_date)->format('d M Y') : 'To be confirmed',
            'status' => $purchaseOrder->status,
            'items' => $items,
            'subtotal' => $subtotal,
            'tax' => $taxAmount,
            'grand_total' => $grandTotal,
            'notes' => $purchaseOrder->notes ?? '',
            'created_by' => $purchaseOrder->user->name ?? 'Admin'
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
            'address' => $company->company_address ?? 'Jl. Jakarta Raya No. 123, Jakarta Selatan, DKI Jakarta'
        ];
    }
}