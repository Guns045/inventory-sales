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
            // Modify status column to include READY_TO_SHIP and CANCELLED
            $table->enum('status', ['PREPARING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
                  ->default('PREPARING')
                  ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            // Revert back to original status options
            $table->enum('status', ['PREPARING', 'SHIPPED', 'DELIVERED'])
                  ->default('PREPARING')
                  ->change();
        });
    }
};
