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
        Schema::create('approval_levels', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Level name (e.g., "Manager", "Director", "CEO")
            $table->text('description')->nullable();
            $table->integer('level_order'); // Order in approval chain (1, 2, 3...)
            $table->foreignId('role_id')->nullable()->constrained()->onDelete('cascade'); // Role that can approve this level
            $table->decimal('min_amount', 15, 2)->default(0); // Minimum amount to require this level
            $table->decimal('max_amount', 15, 2)->nullable(); // Maximum amount for this level
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['level_order']);
            $table->index(['min_amount', 'max_amount']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_levels');
    }
};