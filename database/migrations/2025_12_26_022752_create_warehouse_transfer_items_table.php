<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create the new items table
        Schema::create('warehouse_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_transfer_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained();
            $table->integer('quantity_requested');
            $table->integer('quantity_delivered')->nullable()->default(0);
            $table->integer('quantity_received')->nullable()->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 2. Migrate existing data
        $transfers = DB::table('warehouse_transfers')->get();
        foreach ($transfers as $transfer) {
            if ($transfer->product_id) {
                DB::table('warehouse_transfer_items')->insert([
                    'warehouse_transfer_id' => $transfer->id,
                    'product_id' => $transfer->product_id,
                    'quantity_requested' => $transfer->quantity_requested,
                    'quantity_delivered' => $transfer->quantity_delivered,
                    'quantity_received' => $transfer->quantity_received,
                    'notes' => $transfer->notes, // Copy notes to item level as well, or keep null
                    'created_at' => $transfer->created_at,
                    'updated_at' => $transfer->updated_at,
                ]);
            }
        }

        // 3. Drop columns from parent table (Make them nullable first if we want to be safe, but here we drop)
        Schema::table('warehouse_transfers', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropColumn(['product_id', 'quantity_requested', 'quantity_delivered', 'quantity_received']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Add columns back
        Schema::table('warehouse_transfers', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->constrained();
            $table->integer('quantity_requested')->nullable();
            $table->integer('quantity_delivered')->nullable();
            $table->integer('quantity_received')->nullable();
        });

        // 2. Restore data (Take the first item for each transfer - imperfect reverse)
        $items = DB::table('warehouse_transfer_items')->get();
        foreach ($items as $item) {
            DB::table('warehouse_transfers')
                ->where('id', $item->warehouse_transfer_id)
                ->update([
                        'product_id' => $item->product_id,
                        'quantity_requested' => $item->quantity_requested,
                        'quantity_delivered' => $item->quantity_delivered,
                        'quantity_received' => $item->quantity_received,
                    ]);
        }

        // 3. Drop items table
        Schema::dropIfExists('warehouse_transfer_items');
    }
};
