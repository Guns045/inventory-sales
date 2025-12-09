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
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable()->change();
            $table->unsignedBigInteger('supplier_id')->nullable()->change();
            $table->decimal('buy_price', 15, 2)->nullable()->change();
            $table->decimal('sell_price', 15, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable(false)->change();
            $table->unsignedBigInteger('supplier_id')->nullable(false)->change();
            $table->decimal('buy_price', 15, 2)->nullable(false)->change();
            $table->decimal('sell_price', 15, 2)->nullable(false)->change();
        });
    }
};
