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
        Schema::create('finance_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['CASH', 'BANK'])->default('BANK');
            $table->string('currency')->default('IDR');
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('account_number')->nullable();
            $table->string('bank_name')->nullable(); // e.g. BCA, Mandiri
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('finance_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finance_account_id')->constrained('finance_accounts')->onDelete('restrict');
            $table->enum('type', ['IN', 'OUT']); // IN = Credit (Masuk), OUT = Debit (Keluar)
            $table->decimal('amount', 15, 2);
            $table->date('transaction_date');
            $table->string('description');
            $table->string('reference_type')->nullable(); // App\Models\Payment, App\Models\Expense
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('category')->nullable(); // Sales, Expense, Transfer, Adjustment
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_transactions');
        Schema::dropIfExists('finance_accounts');
    }
};
