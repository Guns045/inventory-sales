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
        Schema::table('approvals', function (Blueprint $table) {
            $table->foreignId('approval_level_id')->nullable()->after('approvable_id')->constrained()->onDelete('set null');
            $table->integer('level_order')->nullable()->after('approval_level_id'); // Current level in the chain
            $table->json('approval_chain')->nullable()->after('level_order'); // Store the complete approval chain
            $table->foreignId('next_approver_id')->nullable()->after('approver_id')->constrained('users')->onDelete('set null');
            $table->timestamp('final_approval_at')->nullable()->after('approved_at');
            $table->enum('workflow_status', ['IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED'])->default('IN_PROGRESS')->after('final_approval_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('approvals', function (Blueprint $table) {
            $table->dropForeign(['approval_level_id']);
            $table->dropForeign(['next_approver_id']);
            $table->dropColumn([
                'approval_level_id',
                'level_order',
                'approval_chain',
                'next_approver_id',
                'final_approval_at',
                'workflow_status'
            ]);
        });
    }
};