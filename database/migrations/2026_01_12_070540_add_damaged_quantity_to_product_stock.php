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
        Schema::table('product_stock', function (Blueprint $table) {
            // Add damaged_quantity column
            $table->integer('damaged_quantity')->default(0)->after('reserved_quantity');

            // Add available_quantity column for clarity (calculated field in code, but useful for queries)
            // available_quantity = quantity - reserved_quantity - damaged_quantity
            $table->integer('available_quantity')->default(0)->after('quantity');

            // Add index for reporting queries
            $table->index('damaged_quantity');
        });

        // Update existing records to set available_quantity
        DB::statement('UPDATE product_stock SET available_quantity = quantity - reserved_quantity');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_stock', function (Blueprint $table) {
            $table->dropIndex(['damaged_quantity']);
            $table->dropColumn(['damaged_quantity', 'available_quantity']);
        });
    }
};
