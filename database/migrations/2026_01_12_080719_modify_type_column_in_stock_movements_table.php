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
        Schema::table('stock_movements', function (Blueprint $table) {
            // Change enum to string to support more types without modifying enum definition repeatedly
            // Note: We use DB::statement because ->change() has limitations with enums in some drivers
            // and we want to be safe.
            // However, typical Laravel way if doctrine/dbal is present:
            if (DB::getDriverName() !== 'sqlite') {
                $table->string('type', 50)->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            // Revert back to enum if needed, but it's lossy if we have new types.
            // For now, let's just leave it as string or revert to known enums if we force it.
            // $table->enum('type', ['IN', 'OUT', 'ADJUSTMENT'])->change(); 
        });
    }
};
