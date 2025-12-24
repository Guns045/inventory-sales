<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDeliveryOrderStatusRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'status' => 'required|in:PREPARING,READY_TO_SHIP,SHIPPED,DELIVERED,CANCELLED',
            'shipping_date' => 'nullable|date',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'tracking_number' => 'nullable|string|max:255',
            'delivery_vendor' => 'nullable|string|max:255',
            'delivery_method' => 'nullable|string|in:Internal,Truck,Air Freight,Sea Freight,Bus Cargo',
            'shipping_contact_person' => 'nullable|string|max:255',
        ];
    }
}
