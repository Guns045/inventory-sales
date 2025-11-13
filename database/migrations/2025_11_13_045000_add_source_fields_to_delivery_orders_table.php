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
        Schema::table('delivery_orders', function (Blueprint $table) {
            // Add source_type field to track if delivery order comes from SO or IT
            $table->enum('source_type', ['SO', 'IT'])->default('SO')->after('sales_order_id');

            // Add source_id field for reference to source document
            $table->unsignedBigInteger('source_id')->after('source_type');

            // Make sales_order_id nullable since we might have IT transfers
            $table->unsignedBigInteger('sales_order_id')->nullable()->change();

            // Add indexes for better performance
            $table->index(['source_type', 'source_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropIndex(['source_type', 'source_id']);
            $table->dropColumn(['source_type', 'source_id']);

            // Make sales_order_id not nullable again
            $table->unsignedBigInteger('sales_order_id')->nullable(false)->change();
        });
    }
};