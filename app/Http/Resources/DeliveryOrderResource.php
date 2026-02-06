<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'delivery_order_number' => $this->delivery_order_number,
            'sales_order_id' => $this->sales_order_id,
            'sales_order' => $this->whenLoaded('salesOrder'),
            'picking_list_id' => $this->picking_list_id,
            'picking_list' => $this->whenLoaded('pickingList'),
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'source_type' => $this->source_type,
            'source_id' => $this->source_id,
            'warehouse_transfer' => $this->whenLoaded('warehouseTransfer'),
            'shipping_date' => $this->shipping_date,
            'shipping_contact_person' => $this->shipping_contact_person,
            'shipping_address' => $this->shipping_address,
            'shipping_city' => $this->shipping_city,
            'driver_name' => $this->driver_name,
            'vehicle_plate_number' => $this->vehicle_plate_number,
            'status' => $this->status,
            'status_label' => $this->status_label,
            'status_color' => $this->status_color,
            'notes' => $this->notes,
            'delivered_at' => $this->delivered_at,
            'created_by' => $this->created_by,
            'total_amount' => $this->total_amount,
            'recipient_name' => $this->recipient_name,
            'recipient_title' => $this->recipient_title,
            'items' => $this->whenLoaded('deliveryOrderItems', function () {
                return $this->mapItems($this->deliveryOrderItems);
            }),
            'delivery_order_items' => $this->whenLoaded('deliveryOrderItems', function () {
                return $this->mapItems($this->deliveryOrderItems);
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function mapItems($items)
    {
        return $items->map(function ($item) {
            return [
                'id' => $item->id,
                'product' => $item->product,
                'sales_order_item' => $item->salesOrderItem,
                'quantity' => $item->quantity_shipped,
                'quantity_shipped' => $item->quantity_shipped,
                'quantity_delivered' => $item->quantity_delivered,
                'status' => $item->status,
                'location_code' => $item->location_code,
                'delivered_at' => $item->delivered_at,
                'notes' => $item->notes,
            ];
        });
    }
}
