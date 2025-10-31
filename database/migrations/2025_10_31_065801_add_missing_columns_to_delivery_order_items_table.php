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
        Schema::table('delivery_order_items', function (Blueprint $table) {
            $table->integer('quantity_delivered')->nullable()->after('quantity_shipped');
            $table->enum('status', ['PREPARING', 'IN_TRANSIT', 'DELIVERED', 'PARTIAL', 'DAMAGED'])->default('PREPARING')->after('quantity_delivered');
            $table->string('location_code')->nullable()->after('status');
            $table->text('notes')->nullable()->after('location_code');
            $table->datetime('delivered_at')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_order_items', function (Blueprint $table) {
            $table->dropColumn(['quantity_delivered', 'status', 'location_code', 'notes', 'delivered_at']);
        });
    }
};
