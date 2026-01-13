<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceStatusRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'status' => 'required|in:UNPAID,PAID,PARTIAL,OVERDUE,CANCELLED',
            'notes' => 'nullable|string|max:500'
        ];
    }
}
