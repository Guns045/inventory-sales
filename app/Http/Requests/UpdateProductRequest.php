<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($this->route('product'))],
=======
    public function rules()
    {
        $productId = $this->route('id') ?? $this->route('product');

        return [
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($productId)],
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
