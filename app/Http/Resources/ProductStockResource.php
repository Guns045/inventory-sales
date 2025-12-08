<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductStockResource extends JsonResource
{
    public function toArray($request)
    {
        $user = $request->user();
        $isSuperAdmin = $user && ($user->role === 'Super Admin' || ($user->role && $user->role->name === 'Super Admin'));
        $shouldHide = $this->is_hidden && !$isSuperAdmin;

        // Handle nested stocks for all-warehouses view
        $stocks = null;
        if ($this->stocks) {
            $stocks = ProductStockResource::collection($this->stocks)->resolve();
        }

        // For all-warehouses view, if any stock is hidden, hide the totals
        if ($this->view_mode === 'all-warehouses' && $this->stocks && !$isSuperAdmin) {
            $hasHiddenStock = $this->stocks->contains('is_hidden', true);
            if ($hasHiddenStock) {
                $shouldHide = true;
            }
        }

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product' => $this->whenLoaded('product'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'quantity' => $shouldHide ? null : $this->quantity,
            'reserved_quantity' => $shouldHide ? null : $this->reserved_quantity,
            'available_quantity' => $shouldHide ? null : ($this->available_quantity ?? ($this->quantity - $this->reserved_quantity)),
            'min_stock_level' => $this->min_stock_level ?? null,
            'bin_location' => $this->bin_location,
            'is_hidden' => $this->is_hidden,
            'view_mode' => $this->view_mode ?? 'per-warehouse',
            'stocks' => $stocks,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
