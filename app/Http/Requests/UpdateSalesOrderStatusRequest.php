<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSalesOrderStatusRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'status' => 'required|in:PENDING,PROCESSING,READY_TO_SHIP,SHIPPED,COMPLETED,CANCELLED',
        ];
    }
}
