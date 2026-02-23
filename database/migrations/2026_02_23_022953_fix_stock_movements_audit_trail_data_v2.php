<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Normalize reference_type to use Morph Map keys
        $mappings = [
            'App\Models\DeliveryOrder' => 'DeliveryOrder',
            'App\Models\GoodsReceipt' => 'GoodsReceipt',
            'App\Models\PurchaseOrder' => 'PurchaseOrder',
            'App\Models\Quotation' => 'Quotation',
            'App\Models\SalesOrder' => 'SalesOrder',
            'App\Models\WarehouseTransfer' => 'WarehouseTransfer',
            'App\Models\Invoice' => 'Invoice',
            'App\Models\SalesReturn' => 'SalesReturn',
        ];

        foreach ($mappings as $fullClass => $shortKey) {
            DB::table('stock_movements')
                ->where('reference_type', $fullClass)
                ->update(['reference_type' => $shortKey]);
        }

        // 2. Backfill missing reference_number
        $movements = DB::table('stock_movements')
            ->whereNull('reference_number')
            ->whereNotNull('reference_id')
            ->whereNotNull('reference_type')
            ->get();

        foreach ($movements as $movement) {
            $number = null;

            switch ($movement->reference_type) {
                case 'DeliveryOrder':
                    $number = DB::table('delivery_orders')->where('id', $movement->reference_id)->value('delivery_order_number');
                    break;
                case 'Quotation':
                    $number = DB::table('quotations')->where('id', $movement->reference_id)->value('quotation_number');
                    break;
                case 'GoodsReceipt':
                    $number = DB::table('goods_receipts')->where('id', $movement->reference_id)->value('receipt_number');
                    break;
                case 'SalesOrder':
                    $number = DB::table('sales_orders')->where('id', $movement->reference_id)->value('sales_order_number');
                    break;
                case 'PurchaseOrder':
                    $number = DB::table('purchase_orders')->where('id', $movement->reference_id)->value('po_number');
                    break;
                case 'Invoice':
                    $number = DB::table('invoices')->where('id', $movement->reference_id)->value('invoice_number');
                    break;
                case 'SalesReturn':
                    $number = DB::table('sales_returns')->where('id', $movement->reference_id)->value('return_number');
                    break;
                case 'WarehouseTransfer':
                    $number = DB::table('warehouse_transfers')->where('id', $movement->reference_id)->value('transfer_number');
                    break;
            }

            if ($number) {
                DB::table('stock_movements')
                    ->where('id', $movement->id)
                    ->update(['reference_number' => $number]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy way to undo normalization without context of what was original, 
        // but it doesn't hurt to leave them in the normalized state.
    }
};
