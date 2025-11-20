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
        if (!Schema::hasTable('document_counters')) {
            Schema::create('document_counters', function (Blueprint $table) {
            $table->id();
            $table->string('document_type'); // QUOTATION, SALES_ORDER, DELIVERY_ORDER, etc.
            $table->unsignedBigInteger('warehouse_id')->nullable(); // null for GENERAL
            $table->string('prefix'); // PQ, SO, DO, GR, etc.
            $table->integer('counter')->default(1);
            $table->string('year_month'); // Y-m format for monthly reset
            $table->timestamps();

            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->unique(['document_type', 'warehouse_id', 'year_month'], 'doc_counter_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_counters');
    }
};
