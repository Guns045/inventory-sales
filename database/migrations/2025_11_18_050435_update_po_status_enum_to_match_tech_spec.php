<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing data to match new enum values
        DB::statement("UPDATE purchase_orders SET status = 'SENT' WHERE status = 'SUBMITTED'");
        DB::statement("UPDATE purchase_orders SET status = 'CONFIRMED' WHERE status = 'APPROVED'");
        DB::statement("UPDATE purchase_orders SET status = 'COMPLETED' WHERE status = 'RECEIVED'");
        DB::statement("UPDATE purchase_orders SET status = 'COMPLETED' WHERE status = 'CLOSED'");

        // Update enum to match tech spec
        DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('DRAFT','SENT','CONFIRMED','PARTIAL_RECEIVED','COMPLETED','CANCELLED')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to old enum values
        DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('DRAFT','SUBMITTED','APPROVED','PARTIAL_RECEIVED','RECEIVED','CLOSED','CANCELLED')");

        // Update data back to old values
        DB::statement("UPDATE purchase_orders SET status = 'SUBMITTED' WHERE status = 'SENT'");
        DB::statement("UPDATE purchase_orders SET status = 'APPROVED' WHERE status = 'CONFIRMED'");
        DB::statement("UPDATE purchase_orders SET status = 'RECEIVED' WHERE status = 'COMPLETED'");
    }
};
