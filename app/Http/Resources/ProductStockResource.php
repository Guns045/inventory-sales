<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductStockResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product' => $this->whenLoaded('product'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'quantity' => $this->quantity,
            'reserved_quantity' => $this->reserved_quantity,
            'available_quantity' => $this->available_quantity ?? ($this->quantity - $this->reserved_quantity),
            'min_stock_level' => $this->min_stock_level ?? null,
            'view_mode' => $this->view_mode ?? 'per-warehouse',
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
