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
        // Find all delivery order items that belong to a DELIVERED DO 
        // but have NULL quantity_delivered.
        \DB::table('delivery_order_items')
            ->join('delivery_orders', 'delivery_order_items.delivery_order_id', '=', 'delivery_orders.id')
            ->where('delivery_orders.status', 'DELIVERED')
            ->whereNull('delivery_order_items.quantity_delivered')
            ->update([
                'delivery_order_items.quantity_delivered' => \DB::raw('delivery_order_items.quantity_shipped'),
                'delivery_order_items.status' => 'DELIVERED',
                'delivery_order_items.updated_at' => now()
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No simple way to reverse this without affecting intentional data
        // but we can set it back to null for those that were updated.
        // However, it's safer to leave as is since it represents a valid state.
    }
};
