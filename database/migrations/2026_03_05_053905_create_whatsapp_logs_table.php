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
        Schema::create('whatsapp_logs', function (Blueprint $table) {
            $table->id();
            $table->morphs('reference'); // polymorphic relation
            $table->string('target_number', 20);
            $table->string('recipient_name');
            $table->text('message');
            $table->enum('status', ['PENDING', 'SENT', 'FAILED'])->default('PENDING');
            $table->text('provider_response')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_logs');
    }
};
