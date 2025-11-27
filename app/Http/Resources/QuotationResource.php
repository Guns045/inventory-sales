<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'quotation_number' => $this->quotation_number,
            'customer' => $this->whenLoaded('customer'),
            'user' => $this->whenLoaded('user'),
            'warehouse' => $this->whenLoaded('warehouse'),
            'status' => $this->status,
            'valid_until' => $this->valid_until,
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'tax' => $this->tax,
            'total_amount' => $this->total_amount,
            'notes' => $this->notes,
            'payment_term' => $this->payment_term,
            'terms' => $this->terms,
            'tax_rate' => $this->tax_rate,
            'other_costs' => $this->other_costs,
            'created_by' => $this->created_by,
            'items' => $this->whenLoaded('quotationItems', function () {
                return $this->quotationItems->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product' => $item->product,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'discount_percentage' => $item->discount_percentage,
                        'tax_rate' => $item->tax_rate,
                        'total_price' => $item->total_price,
                    ];
                });
            }),
            'approvals' => $this->whenLoaded('approvals'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
