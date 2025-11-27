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
            if (!Schema::hasColumn('quotations', 'tax_rate')) {
                $table->decimal('tax_rate', 5, 2)->default(0)->after('total_amount');
            }
            if (!Schema::hasColumn('quotations', 'other_costs')) {
                $table->decimal('other_costs', 15, 2)->default(0)->after('tax_rate');
            }
            if (!Schema::hasColumn('quotations', 'payment_term')) {
                $table->string('payment_term')->nullable()->after('other_costs');
            }
            if (!Schema::hasColumn('quotations', 'terms')) {
                $table->text('terms')->nullable()->after('payment_term');
            }
            if (!Schema::hasColumn('quotations', 'notes')) {
                $table->text('notes')->nullable()->after('terms');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('quotations', 'notes'))
                $columns[] = 'notes';
            if (Schema::hasColumn('quotations', 'terms'))
                $columns[] = 'terms';
            if (Schema::hasColumn('quotations', 'payment_term'))
                $columns[] = 'payment_term';
            if (Schema::hasColumn('quotations', 'other_costs'))
                $columns[] = 'other_costs';
            if (Schema::hasColumn('quotations', 'tax_rate'))
                $columns[] = 'tax_rate';

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
