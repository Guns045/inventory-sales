<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseTransferItemResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product' => $this->whenLoaded('product', function () {
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'sku' => $this->product->sku,
                    'unit' => $this->product->unit,
                ];
            }),
            'quantity_requested' => $this->quantity_requested,
            'quantity_delivered' => $this->quantity_delivered,
            'quantity_received' => $this->quantity_received,
            'notes' => $this->notes,
        ];
    }
}
