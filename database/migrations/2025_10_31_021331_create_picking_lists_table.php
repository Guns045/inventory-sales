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
        Schema::create('picking_lists', function (Blueprint $table) {
            $table->id();
            $table->string('picking_list_number')->unique();
            $table->unsignedBigInteger('sales_order_id');
            $table->unsignedBigInteger('user_id'); // Staff yang membuat picking list
            $table->enum('status', ['DRAFT', 'READY', 'PICKING', 'COMPLETED', 'CANCELLED'])->default('DRAFT');
            $table->text('notes')->nullable();
            $table->timestamp('picked_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('picking_lists');
    }
};
