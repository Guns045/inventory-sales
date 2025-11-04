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
        Schema::create('warehouse_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_number')->unique(); // Auto-generated: IT-YYYYMMDD-001
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('warehouse_from_id')->constrained('warehouses')->onDelete('cascade');
            $table->foreignId('warehouse_to_id')->constrained('warehouses')->onDelete('cascade');
            $table->integer('quantity_requested')->unsigned();
            $table->integer('quantity_delivered')->unsigned()->default(0);
            $table->integer('quantity_received')->unsigned()->default(0);
            $table->enum('status', ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'])->default('REQUESTED');
            $table->text('notes')->nullable();
            $table->text('reason')->nullable(); // For cancellation/rejection
            $table->foreignId('requested_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('delivered_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('delivered_at')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('received_at')->nullable();
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamps();

            // Indexes for performance
            $table->index(['status', 'warehouse_from_id']);
            $table->index(['status', 'warehouse_to_id']);
            $table->index(['warehouse_from_id', 'warehouse_to_id']);
            $table->index(['transfer_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warehouse_transfers');
    }
};