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
        Schema::table('goods_receipts', function (Blueprint $table) {
            // Add missing fields for goods_receipts
            $table->string('status')->default('PENDING')->after('notes');
            $table->unsignedBigInteger('warehouse_id')->nullable()->after('user_id');
            $table->unsignedBigInteger('received_by')->nullable()->after('warehouse_id');

            // Add foreign key constraints
            $table->foreign('warehouse_id')->references('id')->on('warehouses');
            $table->foreign('received_by')->references('id')->on('users');
        });

        Schema::table('goods_receipt_items', function (Blueprint $table) {
            // Add missing fields for goods_receipt_items
            $table->unsignedBigInteger('product_id')->after('purchase_order_item_id');
            $table->string('uom', 50)->nullable()->after('quantity_received');
            $table->string('batch_number', 100)->nullable()->after('condition');
            $table->string('serial_number', 255)->nullable()->after('batch_number');

            // Add foreign key constraint
            $table->foreign('product_id')->references('id')->on('products');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('goods_receipt_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropColumn(['product_id', 'uom', 'batch_number', 'serial_number']);
        });

        Schema::table('goods_receipts', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropForeign(['received_by']);
            $table->dropColumn(['status', 'warehouse_id', 'received_by']);
        });
    }
};
