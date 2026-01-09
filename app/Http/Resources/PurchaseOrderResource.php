<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'po_number' => $this->po_number,
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user'),
            'status' => $this->status,
            'order_date' => $this->order_date,
            'expected_delivery_date' => $this->expected_delivery_date,
            'total_amount' => $this->total_amount,
            'paid_amount' => $this->paid_amount,
            'payment_status' => $this->payment_status,
            'formatted_total' => $this->formatted_total,
            'notes' => $this->notes,
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product' => $item->product,
                        'quantity_ordered' => $item->quantity_ordered,
                        'quantity_received' => $item->quantity_received,
                        'unit_price' => $item->unit_price,
                        'notes' => $item->notes,
                    ];
                });
            }),
            'goods_receipts' => $this->whenLoaded('goodsReceipts'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
