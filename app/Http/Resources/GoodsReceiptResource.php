<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GoodsReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receipt_number' => $this->receipt_number,
            'purchase_order_id' => $this->purchase_order_id,
            'purchase_order' => [
                'id' => $this->purchaseOrder->id,
                'po_number' => $this->purchaseOrder->po_number,
                'supplier_name' => $this->purchaseOrder->supplier->name ?? 'N/A',
            ],
            'warehouse_id' => $this->warehouse_id,
            'warehouse_name' => $this->warehouse->name ?? 'N/A',
            'received_by' => $this->received_by,
            'received_by_name' => $this->receivedBy->name ?? 'N/A',
            'status' => $this->status,
            'status_badge' => $this->status_badge,
            'receipt_date' => $this->receipt_date->format('Y-m-d'),
            'notes' => $this->notes,
            'total_amount' => $this->total_amount,
            'formatted_total_amount' => $this->formatted_total,
            'items' => $this->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'purchase_order_item_id' => $item->purchase_order_item_id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name ?? 'N/A',
                    'product_code' => $item->product->product_code ?? 'N/A',
                    'quantity_ordered' => $item->quantity_ordered,
                    'quantity_received' => $item->quantity_received,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                    'condition' => $item->condition,
                    'batch_number' => $item->batch_number,
                    'expiry_date' => $item->expiry_date,
                ];
            }),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
