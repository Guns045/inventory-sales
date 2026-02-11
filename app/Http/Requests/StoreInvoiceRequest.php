<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'sales_order_id' => 'required_without:delivery_order_id|exists:sales_orders,id',
            'delivery_order_id' => 'nullable|exists:delivery_orders,id',
            'selected_so_ids' => 'nullable|array',
            'selected_so_ids.*' => 'exists:sales_orders,id',
            'items' => 'nullable|array',
            'items.*.id' => 'required_with:items|exists:delivery_order_items,id',
            'items.*.tax_rate' => 'required_with:items|numeric|min:0|max:100',
            'customer_id' => 'required|exists:customers,id',
            'issue_date' => 'required|date',
            'due_date' => 'required|date',
            'status' => 'required|in:UNPAID,PAID,PARTIAL,OVERDUE',
            'po_number' => 'nullable|string|max:255',
        ];
    }
}
