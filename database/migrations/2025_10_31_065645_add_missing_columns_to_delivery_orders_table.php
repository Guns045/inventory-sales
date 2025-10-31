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
            $table->unsignedBigInteger('picking_list_id')->nullable()->after('status');
            $table->unsignedBigInteger('created_by')->nullable()->after('picking_list_id');
            $table->text('notes')->nullable()->after('created_by');
            $table->datetime('delivered_at')->nullable()->after('notes');

            $table->foreign('picking_list_id')->references('id')->on('picking_lists')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropForeign(['picking_list_id']);
            $table->dropForeign(['created_by']);
            $table->dropColumn(['picking_list_id', 'created_by', 'notes', 'delivered_at']);
        });
    }
};
