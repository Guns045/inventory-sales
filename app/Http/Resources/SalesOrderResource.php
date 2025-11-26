<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalesOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'sales_order_number' => $this->sales_order_number,
            'quotation_id' => $this->quotation_id,
            'quotation' => $this->whenLoaded('quotation'),
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer'),
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'status' => $this->status,
            'total_amount' => $this->total_amount,
            'notes' => $this->notes,
            'items' => $this->whenLoaded('salesOrderItems', function () {
                return $this->salesOrderItems->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product' => $item->product,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'discount_percentage' => $item->discount_percentage,
                        'tax_rate' => $item->tax_rate,
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
