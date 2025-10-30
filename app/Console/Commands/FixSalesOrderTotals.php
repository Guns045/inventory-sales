<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;

class FixSalesOrderTotals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sales-orders:fix-totals';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix total_price and total_amount calculations for all sales orders';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Sales Order total calculation fix...');

        $salesOrders = SalesOrder::with('salesOrderItems')->get();
        $count = 0;

        foreach ($salesOrders as $order) {
            $totalAmount = 0;

            // Update total_price for each item and calculate total
            foreach ($order->salesOrderItems as $item) {
                $itemTotal = $item->quantity * $item->unit_price;

                // Apply discount if any
                if ($item->discount_percentage > 0) {
                    $discountAmount = $itemTotal * ($item->discount_percentage / 100);
                    $itemTotal -= $discountAmount;
                }

                // Apply tax if any
                if ($item->tax_rate > 0) {
                    $taxAmount = $itemTotal * ($item->tax_rate / 100);
                    $itemTotal += $taxAmount;
                }

                // Update the item's total_price
                $item->total_price = $itemTotal;
                $item->save();

                $totalAmount += $itemTotal;
            }

            // Update the order's total_amount
            $order->total_amount = $totalAmount;
            $order->save();

            $this->info("Updated Sales Order {$order->sales_order_number}: Total = {$totalAmount}");
            $count++;
        }

        $this->info("Sales Order data integrity fix completed! Updated {$count} orders.");
        return 0;
    }
}
