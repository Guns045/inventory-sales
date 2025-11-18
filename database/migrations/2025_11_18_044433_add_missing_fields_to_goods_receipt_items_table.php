<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('goods_receipt_items', function (Blueprint $table) {
            $table->integer('quantity_ordered')->nullable()->after('product_id');
            $table->decimal('unit_price', 10, 2)->nullable()->after('quantity_received');
            $table->decimal('line_total', 10, 2)->nullable()->after('unit_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('goods_receipt_items', function (Blueprint $table) {
            $table->dropColumn(['quantity_ordered', 'unit_price', 'line_total']);
        });
    }
};
