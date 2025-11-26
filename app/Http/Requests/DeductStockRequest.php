<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeductStockRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'sales_order_id' => 'required|exists:sales_orders,id',
        ];
    }
}
