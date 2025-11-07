<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Warehouse;
use App\Models\ProductStock;

class CheckWarehouses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:warehouses';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check warehouse and product stock data';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== WAREHOUSES DATA ===');
        $warehouses = Warehouse::all();

        foreach ($warehouses as $warehouse) {
            $this->line("ID: {$warehouse->id} | Name: {$warehouse->name} | Location: {$warehouse->location} | Code: {$warehouse->code}");
        }

        $this->info(PHP_EOL . '=== PRODUCT STOCKS BY WAREHOUSE ===');

        // Group product stocks by warehouse
        $stocksByWarehouse = ProductStock::with(['product', 'warehouse'])
            ->get()
            ->groupBy('warehouse_id');

        foreach ($stocksByWarehouse as $warehouseId => $stocks) {
            $warehouse = $stocks->first()->warehouse;
            $this->info(PHP_EOL . "WAREHOUSE: {$warehouse->name} (ID: {$warehouseId}) | Location: {$warehouse->location}");
            $this->line(str_repeat('-', 80));

            foreach ($stocks as $stock) {
                $this->line("  Product: {$stock->product->name} ({$stock->product->sku}) | Qty: {$stock->quantity} | Reserved: {$stock->reserved_quantity}");
            }
        }

        $this->info(PHP_EOL . '=== SUMMARY ===');
        $this->line('Total Warehouses: ' . $warehouses->count());
        $this->line('Total Product Stock Records: ' . ProductStock::count());

        return Command::SUCCESS;
    }
}
