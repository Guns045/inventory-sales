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
        Schema::create('approval_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Rule name (e.g., "High Value Quotations")
            $table->text('description')->nullable();
            $table->string('document_type'); // Document type (e.g., "Quotation", "PurchaseOrder")
            $table->decimal('min_amount', 15, 2)->default(0); // Minimum amount to trigger this rule
            $table->decimal('max_amount', 15, 2)->nullable(); // Maximum amount for this rule
            $table->json('approval_levels'); // Array of approval level IDs required
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['document_type']);
            $table->index(['min_amount', 'max_amount']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_rules');
    }
};