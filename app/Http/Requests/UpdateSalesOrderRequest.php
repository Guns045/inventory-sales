<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSalesOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'quotation_id' => 'nullable|exists:quotations,id',
            'customer_id' => 'sometimes|required|exists:customers,id',
            'status' => 'sometimes|required|in:PENDING,PROCESSING,READY_TO_SHIP,SHIPPED,COMPLETED,CANCELLED',
            'terms_of_payment' => 'nullable|string|in:CASH,NET_15,NET_30,NET_45,NET_60',
            'notes' => 'nullable|string',
            'po_number' => 'nullable|string|max:255',
            'items' => 'sometimes|required|array|min:1',
            'items.*.product_id' => 'sometimes|required|exists:products,id',
            'items.*.quantity' => 'sometimes|required|integer|min:1',
            'items.*.unit_price' => 'sometimes|required|numeric|min:0',
            'items.*.discount_percentage' => 'sometimes|required|numeric|min:0|max:100',
            'items.*.tax_rate' => 'sometimes|required|numeric|min:0',
        ];
    }
}
