<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePickingListRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.quantity_picked' => 'required|integer|min:0',
            'items.*.location_code' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ];
    }
}
