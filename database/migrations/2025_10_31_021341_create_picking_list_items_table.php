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
        Schema::create('picking_list_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('picking_list_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('warehouse_id')->nullable();
            $table->string('location_code')->nullable(); // Lokasi rak misal: A1-01-03
            $table->integer('quantity_required');
            $table->integer('quantity_picked')->default(0);
            $table->enum('status', ['PENDING', 'PARTIAL', 'COMPLETED'])->default('PENDING');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('picking_list_id')->references('id')->on('picking_lists')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('picking_list_items');
    }
};
