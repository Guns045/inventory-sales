<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWarehouseTransferRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'product_id' => 'required|exists:products,id',
            'warehouse_from_id' => 'required|exists:warehouses,id',
            'warehouse_to_id' => 'required|exists:warehouses,id|different:warehouse_from_id',
            'quantity_requested' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
