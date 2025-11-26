<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarkAsDeliveredRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'delivery_items' => 'required|array',
            'delivery_items.*.delivery_order_item_id' => 'required|exists:delivery_order_items,id',
            'delivery_items.*.quantity_delivered' => 'required|integer|min:0',
            'delivery_items.*.status' => 'required|in:DELIVERED,PARTIAL,DAMAGED',
            'delivery_items.*.notes' => 'nullable|string',
            'recipient_name' => 'nullable|string|max:255',
            'recipient_title' => 'nullable|string|max:255',
        ];
    }
}
