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
        Schema::table('warehouses', function (Blueprint $table) {
            // Add code field if it doesn't exist
            if (!Schema::hasColumn('warehouses', 'code')) {
                $table->string('code')->nullable()->after('name');
            }

            // Add is_active field if it doesn't exist
            if (!Schema::hasColumn('warehouses', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('location');
            }

            // Add capacity field if it doesn't exist
            if (!Schema::hasColumn('warehouses', 'capacity')) {
                $table->integer('capacity')->nullable()->after('is_active');
            }

            // Add manager_id field if it doesn't exist
            if (!Schema::hasColumn('warehouses', 'manager_id')) {
                $table->foreignId('manager_id')->nullable()->constrained('users')->onDelete('set null')->after('capacity');
            }

            // Add unique constraint to code if not already exists
            if (Schema::hasColumn('warehouses', 'code') && !Schema::hasColumn('warehouses', 'code_unique')) {
                $table->unique('code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            // Drop columns if they exist
            if (Schema::hasColumn('warehouses', 'manager_id')) {
                $table->dropForeign(['manager_id']);
                $table->dropColumn('manager_id');
            }

            if (Schema::hasColumn('warehouses', 'capacity')) {
                $table->dropColumn('capacity');
            }

            if (Schema::hasColumn('warehouses', 'is_active')) {
                $table->dropColumn('is_active');
            }

            if (Schema::hasColumn('warehouses', 'code')) {
                $table->dropUnique(['code']);
                $table->dropColumn('code');
            }
        });
    }
};
