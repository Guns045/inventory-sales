<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
<<<<<<< HEAD
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
=======
    public function authorize()
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
    {
        return true;
    }

<<<<<<< HEAD
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'sku' => 'required|string|max:255|unique:products,sku',
=======
    public function rules()
    {
        return [
            'sku' => 'required|string|max:255|unique:products',
>>>>>>> 214b47b930652cb6065d8cc620c97749ae2d42bc
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'buy_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'min_stock_level' => 'required|integer|min:0',
        ];
    }
}
