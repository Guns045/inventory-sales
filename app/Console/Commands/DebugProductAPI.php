<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;

class DebugProductAPI extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'debug:product-api';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Debug ProductController API data';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== DEBUGGING PRODUCT API DATA ===');

        // Simulate ProductController index() method
        $products = Product::with(['category', 'supplier', 'productStock.warehouse'])->get();

        $this->info('Total Products: ' . $products->count());

        foreach ($products as $index => $product) {
            $this->info(PHP_EOL . "PRODUCT #" . ($index + 1) . ": {$product->name} ({$product->sku})");

            // Calculate current stock for each product
            $totalQuantity = $product->productStock->sum('quantity');
            $totalReserved = $product->productStock->sum('reserved_quantity');
            $product->current_stock = $totalQuantity - $totalReserved;
            $product->total_stock = $totalQuantity;
            $product->reserved_stock = $totalReserved;

            // Organize stock by warehouse for detailed tracking
            $warehouse_stocks = $product->productStock->map(function ($stock) {
                return [
                    'warehouse_id' => $stock->warehouse_id,
                    'warehouse_name' => $stock->warehouse->name ?? 'Unknown',
                    'warehouse_location' => $stock->warehouse->location ?? 'Unknown',
                    'warehouse_code' => $stock->warehouse->code ?? 'N/A',
                    'quantity' => $stock->quantity,
                    'reserved_quantity' => $stock->reserved_quantity,
                    'available_quantity' => $stock->quantity - $stock->reserved_quantity
                ];
            });

            $this->line('  Warehouse Stocks:');
            foreach ($warehouse_stocks as $ws) {
                $this->line("    - ID: {$ws['warehouse_id']} | {$ws['warehouse_name']} | {$ws['warehouse_location']} | Qty: {$ws['quantity']} | Reserved: {$ws['reserved_quantity']}");
            }

            // Show current stock calculation
            $this->line("  Current Stock: {$product->current_stock} (Total: {$product->total_stock}, Reserved: {$product->reserved_stock})");
        }

        return Command::SUCCESS;
    }
}
