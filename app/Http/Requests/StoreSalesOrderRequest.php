<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Quotation;

class StoreSalesOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [
            'quotation_id' => 'nullable|exists:quotations,id',
            'customer_id' => 'required|exists:customers,id',
            'status' => 'required|in:PENDING,PROCESSING,READY_TO_SHIP,SHIPPED,COMPLETED,CANCELLED',
            'notes' => 'nullable|string',
        ];

        if (!$this->quotation_id) {
            $rules['items'] = 'required|array|min:1';
            $rules['items.*.product_id'] = 'required|exists:products,id';
            $rules['items.*.quantity'] = 'required|integer|min:1';
            $rules['items.*.unit_price'] = 'required|numeric|min:0';
            $rules['items.*.discount_percentage'] = 'required|numeric|min:0|max:100';
            $rules['items.*.tax_rate'] = 'required|numeric|min:0';
        }

        return $rules;
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->quotation_id) {
                $quotation = Quotation::find($this->quotation_id);
                if ($quotation && $quotation->status !== 'APPROVED') {
                    $validator->errors()->add('quotation_id', 'Only approved quotations can be converted to Sales Order');
                }
            }
        });
    }
}
