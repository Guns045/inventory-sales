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
        Schema::create('raw_products', function (Blueprint $table) {
            $table->id();
            $table->string('part_number', 100)->unique();
            $table->text('description');
            $table->string('category')->nullable();
            $table->string('supplier')->nullable();
            $table->decimal('buy_price', 15, 2)->nullable();
            $table->decimal('sell_price', 15, 2)->nullable();
            $table->boolean('is_processed')->default(false);
            $table->string('source_file')->nullable();
            $table->integer('row_number')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Indexes for fast searching
            $table->index(['part_number']);
            $table->index(['is_processed']);
            $table->index(['category']);
            $table->index(['supplier']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raw_products');
    }
};
