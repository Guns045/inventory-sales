<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TransactionResetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Schema::disableForeignKeyConstraints();

        // 1. Payments & Invoices
        DB::table('payments')->truncate();
        DB::table('invoice_items')->truncate();
        DB::table('invoices')->truncate();

        // 2. Delivery Orders & Picking Lists
        DB::table('delivery_order_items')->truncate();
        DB::table('delivery_orders')->truncate();
        DB::table('picking_list_items')->truncate();
        DB::table('picking_lists')->truncate();

        // 3. Sales Orders
        DB::table('sales_order_items')->truncate();
        DB::table('sales_orders')->truncate();

        // 4. Quotations
        DB::table('quotation_items')->truncate();
        DB::table('quotations')->truncate();

        // 5. Stock Movements (Logs)
        // Only clear movements related to the above transactions if possible, 
        // but for a full reset, truncating is cleaner.
        // Assuming we want to keep Purchase Order logs if we aren't deleting POs?
        // The user didn't ask to delete POs.
        // Let's delete movements where reference_type is NOT PurchaseOrder or StockAdjustment?
        // Or just truncate all if they want a clean slate.
        // Given the request "reset data ...", usually implies a clean slate for sales.
        // I'll delete movements related to sales.

        $salesTypes = [
            'App\\Models\\SalesOrder',
            'App\\Models\\DeliveryOrder',
            'App\\Models\\Invoice',
            'App\\Models\\PickingList'
        ];

        DB::table('stock_movements')
            ->whereIn('reference_type', $salesTypes)
            ->orWhere('reference_type', 'like', '%Sales%')
            ->orWhere('reference_type', 'like', '%Delivery%')
            ->delete();

        // 6. Reset Reserved Stock
        // Since we deleted all active sales orders/PLs, reserved stock should be 0.
        DB::table('product_stock')->update(['reserved_quantity' => 0]);

        // 7. Reset Document Counters
        DB::table('document_counters')->truncate();

        Schema::enableForeignKeyConstraints();

        $this->command->info('Sales transaction data has been reset successfully.');
        $this->command->info('Quotations, Sales Orders, Picking Lists, Delivery Orders, Invoices, and Payments have been deleted.');
        $this->command->info('Reserved stock has been reset to 0.');
        $this->command->info('Document counters have been reset to 001.');
    }
}
