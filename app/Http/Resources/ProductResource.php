<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'buy_price' => (float) $this->buy_price,
            'sell_price' => (float) $this->sell_price,
            'min_stock_level' => (int) $this->min_stock_level,
            'current_stock' => (int) $this->current_stock,
            'total_stock' => (int) $this->total_stock,
            'reserved_stock' => (int) $this->reserved_stock,
            'warehouse_stocks' => $this->warehouse_stocks,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
