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
        Schema::table('delivery_order_items', function (Blueprint $table) {
            // Check if column exists first to be safe
            if (!Schema::hasColumn('delivery_order_items', 'sales_order_item_id')) {
                $table->unsignedBigInteger('sales_order_item_id')->nullable()->after('delivery_order_id');
                $table->foreign('sales_order_item_id')->references('id')->on('sales_order_items')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_order_items', function (Blueprint $table) {
            if (Schema::hasColumn('delivery_order_items', 'sales_order_item_id')) {
                $table->dropForeign(['sales_order_item_id']);
                $table->dropColumn('sales_order_item_id');
            }
        });
    }
};
