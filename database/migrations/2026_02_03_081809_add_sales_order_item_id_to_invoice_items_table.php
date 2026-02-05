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
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->unsignedBigInteger('sales_order_item_id')->nullable()->after('invoice_id');
            $table->foreign('sales_order_item_id')->references('id')->on('sales_order_items')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropForeign(['sales_order_item_id']);
            $table->dropColumn('sales_order_item_id');
        });
    }
};
