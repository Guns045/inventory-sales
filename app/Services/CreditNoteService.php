<?php

namespace App\Services;

use App\Models\CreditNote;
use App\Models\SalesReturn;
use App\Models\DocumentCounter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

class CreditNoteService
{
    public function createFromSalesReturn(SalesReturn $salesReturn)
    {
        // Validation: Check if Credit Note already exists for this Return
        if ($salesReturn->creditNote) {
            throw new Exception("Credit Note already exists for this Sales Return.");
        }

        if ($salesReturn->status !== 'APPROVED') {
            throw new Exception("Sales Return must be APPROVED before creating a Credit Note.");
        }

        return DB::transaction(function () use ($salesReturn) {
            // Calculate Total Amount based on original Sales Order prices
            $totalAmount = 0;
            $salesOrder = $salesReturn->salesOrder;

            foreach ($salesReturn->items as $returnItem) {
                // Find original price in Sales Order Items
                $originalItem = $salesOrder->items->where('product_id', $returnItem->product_id)->first();

                if ($originalItem) {
                    // Calculate price with tax and discount
                    $unitPrice = $originalItem->unit_price;
                    $discount = $unitPrice * ($originalItem->discount_percentage / 100);
                    $tax = ($unitPrice - $discount) * ($originalItem->tax_rate / 100);
                    $finalUnitPrice = $unitPrice - $discount + $tax;

                    $totalAmount += $finalUnitPrice * $returnItem->quantity;
                }
            }

            // Generate Credit Note Number
            $warehouseId = $salesOrder->warehouse_id;
            $cnNumber = DocumentCounter::getNextNumber('CREDIT_NOTE', $warehouseId);

            $creditNote = CreditNote::create([
                'credit_note_number' => $cnNumber,
                'sales_return_id' => $salesReturn->id,
                'customer_id' => $salesOrder->customer_id,
                'date' => now(),
                'total_amount' => $totalAmount,
                'status' => 'ISSUED', // Auto-issue for now
                'created_by' => Auth::id(),
                'notes' => "Generated from Sales Return {$salesReturn->return_number}"
            ]);

            return $creditNote;
        });
    }
}
