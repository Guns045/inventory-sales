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
        Schema::table('picking_lists', function (Blueprint $table) {
            // Drop the foreign key constraint first
            $table->dropForeign(['sales_order_id']);

            // Make the column nullable
            $table->unsignedBigInteger('sales_order_id')->nullable()->change();

            // Re-add the foreign key constraint with onDelete('set null')
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('picking_lists', function (Blueprint $table) {
            // Drop the foreign key constraint
            $table->dropForeign(['sales_order_id']);

            // Make the column not nullable
            $table->unsignedBigInteger('sales_order_id')->nullable(false)->change();

            // Re-add the foreign key constraint with onDelete('cascade')
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
        });
    }
};