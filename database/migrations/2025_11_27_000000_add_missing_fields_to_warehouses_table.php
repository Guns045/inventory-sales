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
        Schema::table('warehouses', function (Blueprint $table) {
            if (!Schema::hasColumn('warehouses', 'code')) {
                $table->string('code')->unique()->nullable()->after('name');
            }
            if (!Schema::hasColumn('warehouses', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('location');
            }
            if (!Schema::hasColumn('warehouses', 'capacity')) {
                $table->integer('capacity')->default(0)->after('is_active');
            }
            if (!Schema::hasColumn('warehouses', 'manager_id')) {
                $table->foreignId('manager_id')->nullable()->constrained('users')->onDelete('set null')->after('capacity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('warehouses', 'manager_id'))
                $columns[] = 'manager_id';
            if (Schema::hasColumn('warehouses', 'capacity'))
                $columns[] = 'capacity';
            if (Schema::hasColumn('warehouses', 'is_active'))
                $columns[] = 'is_active';
            if (Schema::hasColumn('warehouses', 'code'))
                $columns[] = 'code';

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
