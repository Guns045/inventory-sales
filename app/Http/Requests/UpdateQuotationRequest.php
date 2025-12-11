<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuotationRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'customer_id' => 'required|exists:customers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'valid_until' => 'required|date',
            'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,REJECTED',
            'terms_of_payment' => 'nullable|string|in:CASH,NET_15,NET_30,NET_45,NET_60',
            'po_number' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
            'items.*.tax_rate' => 'required|numeric|min:0',
        ];
    }
}
