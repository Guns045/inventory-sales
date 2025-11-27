<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWarehouseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'location' => 'required|string',
            'code' => ['required', 'string', 'max:50', Rule::unique('warehouses')->ignore($this->route('warehouse'))],
            'is_active' => 'boolean',
            'capacity' => 'nullable|numeric|min:0',
            'manager_id' => 'nullable|exists:users,id',
        ];
    }
}
