<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Normalize ProductStock to use Morph Map key
        DB::table('stock_movements')
            ->where('reference_type', 'App\Models\ProductStock')
            ->update(['reference_type' => 'ProductStock']);

        // Also catch any other full class names that might have been missed
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy way to undo normalization
    }
};
