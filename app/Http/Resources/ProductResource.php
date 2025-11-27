<?php

namespace App\Http\Resources;

<<<<<<< HEAD
use Illuminate\Http\Request;
=======
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
<<<<<<< HEAD
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
=======
    public function toArray($request)
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
<<<<<<< HEAD
            'category' => new CategoryResource($this->whenLoaded('category')),
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'buy_price' => (float) $this->buy_price,
            'sell_price' => (float) $this->sell_price,
            'min_stock_level' => (int) $this->min_stock_level,
            'current_stock' => (int) $this->current_stock,
            'total_stock' => (int) $this->total_stock,
            'reserved_stock' => (int) $this->reserved_stock,
            'warehouse_stocks' => $this->warehouse_stocks,
=======
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category'),
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier'),
            'buy_price' => $this->buy_price,
            'sell_price' => $this->sell_price,
            'min_stock_level' => $this->min_stock_level,
            'current_stock' => $this->current_stock ?? null,
            'total_stock' => $this->total_stock ?? null,
            'reserved_stock' => $this->reserved_stock ?? null,
            'warehouse_stocks' => $this->warehouse_stocks ?? null,
            'is_low_stock' => $this->isStockLow(),
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
