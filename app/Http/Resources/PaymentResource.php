<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoice_id,
            'invoice' => $this->whenLoaded('invoice', function () {
                return [
                    'id' => $this->invoice->id,
                    'invoice_number' => $this->invoice->invoice_number,
                    'total_amount' => $this->invoice->total_amount,
                    'status' => $this->invoice->status,
                    'customer' => $this->invoice->customer,
                ];
            }),
            'payment_date' => $this->payment_date,
            'amount_paid' => $this->amount_paid,
            'payment_method' => $this->payment_method,
            'reference_number' => $this->reference_number,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
