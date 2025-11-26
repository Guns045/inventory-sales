<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InventoryResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'product_id' => $this->product_id,
            'product_name' => $this->product_name ?? $this->product->name ?? null,
            'product_sku' => $this->product_sku ?? $this->product->sku ?? null,
            'quantity' => $this->quantity,
            'reserved_quantity' => $this->reserved_quantity,
            'available_quantity' => $this->available_quantity ?? ($this->quantity - $this->reserved_quantity),
            'location_code' => $this->location_code,
            'warehouse_id' => $this->warehouse_id,
            'min_stock_level' => $this->min_stock_level ?? $this->product->min_stock_level ?? 0,
            'is_low_stock' => $this->is_low_stock ?? (($this->quantity - $this->reserved_quantity) <= ($this->product->min_stock_level ?? 0)),
        ];
    }
}
