<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePickingListRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Authorization is handled by middleware/policies
    }

    public function rules()
    {
        return [
            'sales_order_id' => 'required_without:delivery_order_id|exists:sales_orders,id',
            'delivery_order_id' => 'nullable|exists:delivery_orders,id',
            'notes' => 'nullable|string',
        ];
    }
}
