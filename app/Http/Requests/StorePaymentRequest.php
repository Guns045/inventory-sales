<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'invoice_id' => 'required|exists:invoices,id',
            'payment_date' => 'required|date|before_or_equal:today',
            'amount_paid' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'reference_number' => 'nullable|string|max:100',
            'credit_note_id' => 'nullable|exists:credit_notes,id',
            'finance_account_id' => 'nullable|exists:finance_accounts,id',
        ];
    }

    public function messages()
    {
        return [
            'payment_date.before_or_equal' => 'Payment date cannot be in the future.',
            'amount_paid.min' => 'Payment amount must be greater than zero.',
        ];
    }
}
