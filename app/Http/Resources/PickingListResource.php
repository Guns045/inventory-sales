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
            'user_id' => $this->user_id,
            'status' => $this->status,
            'notes' => $this->notes,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Relationships
            'sales_order' => $this->whenLoaded('salesOrder'),
            'items' => $this->whenLoaded('items'),
            'user' => $this->whenLoaded('user'),
        ];
    }
}
