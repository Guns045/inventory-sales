<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseTransferResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'transfer_number' => $this->transfer_number,
            'items' => WarehouseTransferItemResource::collection($this->whenLoaded('items')),
            'warehouse_from_id' => $this->warehouse_from_id,
            'warehouseFrom' => $this->whenLoaded('warehouseFrom', function () {
                return [
                    'id' => $this->warehouseFrom->id,
                    'name' => $this->warehouseFrom->name,
                    'code' => $this->warehouseFrom->code
                ];
            }),
            'warehouse_to_id' => $this->warehouse_to_id,
            'warehouseTo' => $this->whenLoaded('warehouseTo', function () {
                return [
                    'id' => $this->warehouseTo->id,
                    'name' => $this->warehouseTo->name,
                    'code' => $this->warehouseTo->code
                ];
            }),
            'status' => $this->status,
            'notes' => $this->notes,
            'reason' => $this->reason,
            'requested_by' => $this->requested_by,
            'requestedBy' => $this->whenLoaded('requestedBy'),
            'approved_by' => $this->approved_by,
            'approvedBy' => $this->whenLoaded('approvedBy'),
            'approved_at' => $this->approved_at,
            'delivered_by' => $this->delivered_by,
            'deliveredBy' => $this->whenLoaded('deliveredBy'),
            'delivered_at' => $this->delivered_at,
            'received_by' => $this->received_by,
            'receivedBy' => $this->whenLoaded('receivedBy'),
            'received_at' => $this->received_at,
            'requested_at' => $this->requested_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
