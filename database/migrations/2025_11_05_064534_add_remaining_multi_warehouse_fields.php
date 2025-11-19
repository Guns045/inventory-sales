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
        // Check if users table already has warehouse_id column
        if (!Schema::hasColumn('users', 'warehouse_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('set null')->after('role_id');
                $table->boolean('can_access_multiple_warehouses')->default(false)->after('warehouse_id');
            });
        }

        // Add code column to warehouses if it doesn't exist
        if (!Schema::hasColumn('warehouses', 'code')) {
            Schema::table('warehouses', function (Blueprint $table) {
                $table->string('code')->nullable()->after('name');
            });
        }

        // Add unique constraint to warehouse code
        if (Schema::hasColumn('warehouses', 'code')) {
            Schema::table('warehouses', function (Blueprint $table) {
                $table->string('code')->nullable()->change();
                $table->unique('code');
            });
        }

        // Create document counters table for warehouse-specific numbering
        if (!Schema::hasTable('document_counters')) {
            Schema::create('document_counters', function (Blueprint $table) {
                $table->id();
                $table->string('document_type'); // QUOTATION, SO, DO, INVOICE, PL, etc.
                $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('cascade');
                $table->string('prefix'); // PQ, SO, DO, PI, PL, etc.
                $table->integer('counter')->default(1);
                $table->string('year_month'); // YYYY-MM format for monthly reset
                $table->timestamps();

                $table->unique(['document_type', 'warehouse_id', 'year_month']);
                $table->index(['document_type', 'year_month']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_counters');

        if (Schema::hasColumn('users', 'warehouse_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['warehouse_id']);
                $table->dropColumn(['warehouse_id', 'can_access_multiple_warehouses']);
            });
        }

        if (Schema::hasColumn('warehouses', 'code')) {
            Schema::table('warehouses', function (Blueprint $table) {
                $table->dropUnique(['code']);
            });
        }
    }
};
