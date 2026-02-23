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
        $map = [
            'App\Models\DeliveryOrder' => 'DeliveryOrder',
            'App\Models\GoodsReceipt' => 'GoodsReceipt',
            'App\Models\PurchaseOrder' => 'PurchaseOrder',
            'App\Models\Quotation' => 'Quotation',
            'App\Models\SalesOrder' => 'SalesOrder',
            'App\Models\WarehouseTransfer' => 'WarehouseTransfer',
            'App\Models\ProductStock' => 'ProductStock',
            'App\Models\Payment' => 'Payment',
            'App\Models\Invoice' => 'Invoice',
            'App\Models\SalesReturn' => 'SalesReturn',
        ];

        foreach ($map as $fullClass => $shortName) {
            \Illuminate\Support\Facades\DB::table('stock_movements')
                ->where('reference_type', $fullClass)
                ->update(['reference_type' => $shortName]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $map = [
            'DeliveryOrder' => 'App\Models\DeliveryOrder',
            'GoodsReceipt' => 'App\Models\GoodsReceipt',
            'PurchaseOrder' => 'App\Models\PurchaseOrder',
            'Quotation' => 'App\Models\Quotation',
            'SalesOrder' => 'App\Models\SalesOrder',
            'WarehouseTransfer' => 'App\Models\WarehouseTransfer',
            'ProductStock' => 'App\Models\ProductStock',
            'Payment' => 'App\Models\Payment',
            'Invoice' => 'App\Models\Invoice',
            'SalesReturn' => 'App\Models\SalesReturn',
        ];

        foreach ($map as $shortName => $fullClass) {
            \Illuminate\Support\Facades\DB::table('stock_movements')
                ->where('reference_type', $shortName)
                ->update(['reference_type' => $fullClass]);
        }
    }
};
