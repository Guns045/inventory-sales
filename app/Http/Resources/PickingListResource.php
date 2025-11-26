<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PickingListResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'picking_list_number' => $this->picking_list_number,
            'sales_order_id' => $this->sales_order_id,
            'sales_order' => $this->whenLoaded('salesOrder'),
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'status' => $this->status,
            'status_label' => $this->status_label,
            'status_color' => $this->status_color,
            'notes' => $this->notes,
            'picked_at' => $this->picked_at,
            'completed_at' => $this->completed_at,
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product' => $item->product,
                        'location_code' => $item->location_code,
                        'quantity_required' => $item->quantity_required,
                        'quantity_picked' => $item->quantity_picked,
                        'status' => $item->status,
                        'notes' => $item->notes,
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
