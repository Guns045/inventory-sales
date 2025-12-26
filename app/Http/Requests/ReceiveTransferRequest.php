<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveTransferRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'items' => 'nullable|array',
            'items.*.id' => 'required_with:items|exists:warehouse_transfer_items,id',
            'items.*.quantity_received' => 'required_with:items|integer|min:1',
            'notes' => 'nullable|string|max:500'
        ];
    }
}
