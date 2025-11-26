<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseOrderStatusRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'status' => 'required|in:DRAFT,SENT,CONFIRMED,PARTIAL_RECEIVED,COMPLETED,CANCELLED',
            'notes' => 'nullable|string',
        ];
    }
}
