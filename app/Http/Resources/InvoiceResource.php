<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'sales_order_id' => $this->sales_order_id,
            'sales_order' => $this->whenLoaded('salesOrder'),
            'po_number' => $this->salesOrder->po_number ?? null,
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'issue_date' => $this->issue_date,
            'due_date' => $this->due_date,
            'status' => $this->status,
            'total_amount' => $this->total_amount,
            'notes' => $this->notes,
            // Payment summary fields
            'total_paid' => $this->whenLoaded('payments', function () {
                return $this->payments->sum('amount_paid');
            }),
            'remaining_balance' => $this->whenLoaded('payments', function () {
                $totalPaid = $this->payments->sum('amount_paid');
                return max(0, $this->total_amount - $totalPaid);
            }),
            'payments_count' => $this->whenLoaded('payments', function () {
                return $this->payments->count();
            }),
            'items' => $this->whenLoaded('invoiceItems', function () {
                return $this->invoiceItems->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product' => $item->product,
                        'description' => $item->description,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'discount_percentage' => $item->discount_percentage,
                        'tax_rate' => $item->tax_rate,
                        'total_price' => $item->total_price,
                    ];
                });
            }),
            'payments' => $this->whenLoaded('payments'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

}
