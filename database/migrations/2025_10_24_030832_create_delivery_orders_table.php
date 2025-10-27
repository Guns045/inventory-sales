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
        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->id();
            $table->string('delivery_order_number');
            $table->unsignedBigInteger('sales_order_id');
            $table->unsignedBigInteger('customer_id');
            $table->date('shipping_date')->nullable();
            $table->string('shipping_contact_person')->nullable();
            $table->text('shipping_address')->nullable();
            $table->string('shipping_city')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('vehicle_plate_number')->nullable();
            $table->enum('status', ['PREPARING', 'SHIPPED', 'DELIVERED'])->default('PREPARING');
            $table->timestamps();
            
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_orders');
    }
};
