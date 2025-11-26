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
            'quantity_received' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:500'
        ];
    }
}
