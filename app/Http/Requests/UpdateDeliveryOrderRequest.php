<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDeliveryOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'sales_order_id' => 'sometimes|exists:sales_orders,id',
            'customer_id' => 'sometimes|exists:customers,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'status' => 'sometimes|in:PREPARING,READY_TO_SHIP,SHIPPED,DELIVERED',
            'delivery_method' => 'nullable|string|max:255',
            'delivery_vendor' => 'nullable|string|max:255',
            'tracking_number' => 'nullable|string|max:255',
            'items' => 'nullable|array',
            'items.*.id' => 'required_with:items|exists:delivery_order_items,id',
            'items.*.quantity' => 'required_with:items|integer|min:0',
            'picking_list_id' => 'nullable|exists:picking_lists,id',
        ];
    }
}
