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
        Schema::table('quotations', function (Blueprint $table) {
            $table->string('terms_of_payment')->nullable()->after('valid_until');
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->string('terms_of_payment')->nullable()->after('customer_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn('terms_of_payment');
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropColumn('terms_of_payment');
        });
    }
};
