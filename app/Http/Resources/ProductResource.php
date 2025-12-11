<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category'),
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier'),
            'buy_price' => $this->buy_price,
            'sell_price' => $this->sell_price,
            'weight' => $this->weight,
            'min_stock_level' => $this->min_stock_level,
            'current_stock' => $this->current_stock ?? null,
            'total_stock' => $this->total_stock ?? null,
            'reserved_stock' => $this->reserved_stock ?? null,
            'warehouse_stocks' => $this->warehouse_stocks ?? null,
            'is_low_stock' => $this->isStockLow(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
