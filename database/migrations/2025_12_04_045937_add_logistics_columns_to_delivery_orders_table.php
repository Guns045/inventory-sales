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
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->string('delivery_method')->default('Truck')->after('status');
            $table->string('delivery_vendor')->nullable()->after('delivery_method');
            $table->string('tracking_number')->nullable()->after('delivery_vendor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_method', 'delivery_vendor', 'tracking_number']);
        });
    }
};
