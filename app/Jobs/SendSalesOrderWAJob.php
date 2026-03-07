<?php

namespace App\Jobs;

use App\Models\SalesOrder;
use App\Models\User;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSalesOrderWAJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $salesOrder;
    public $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(SalesOrder $salesOrder)
    {
        $this->salesOrder = $salesOrder;
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsAppService $waService): void
    {
        // 1. Compile Message
        $customerName = $this->salesOrder->customer->company_name ?? 'Unknown Customer';
        $soNumber = $this->salesOrder->sales_order_number;
        $warehouseName = $this->salesOrder->warehouse->name ?? 'Unknown Warehouse';

        // Load items to get Part Number, Description, and Bin Location (from stock if needed)
        $this->salesOrder->load(['items.product']);

        $itemsList = "";
        foreach ($this->salesOrder->items as $index => $item) {
            $number = $index + 1;
            $partNumber = $item->product ? $item->product->sku : 'N/A';
            $description = $item->product ? ($item->product->name ?? $item->product->description) : 'N/A';
            $binLocation = '-';
            if ($item->product) {
                $stock = $item->product->productStock()->where('warehouse_id', $this->salesOrder->warehouse_id)->first();
                if ($stock && $stock->bin_location) {
                    $binLocation = $stock->bin_location;
                }
            }

            $qty = (int) $item->quantity;
            $itemsList .= "{$number} *{$partNumber}* - {$description} - Qty {$qty} - Bin: {$binLocation}\n";
        }

        $message = "📢 *NOTIFIKASI ORDER BARU*\n\n"
            . "Ada Sales Order baru yang harus segera diproses!\n"
            . "No. SO: *$soNumber*\n"
            . "Customer: *$customerName*\n"
            . "Gudang: *$warehouseName*\n"
            . "Order Items:\n"
            . $itemsList . "\n"
            . "_Silakan cek sistem Inventory untuk memproses pengiriman._";

        // 2. Find Targets (Admins & Warehouse staff of that specific warehouse)
        $targets = User::where('is_active', true)
            ->whereNotNull('phone_number')
            ->where('wa_notification_enabled', true)
            ->get()
            ->filter(function ($user) {
                // Sent to all Admins & Super Admins
                if ($user->hasRole(['Admin', 'Super Admin'])) {
                    return true;
                }

                // Or staff assigned to this specific warehouse who have warehouse roles
                if ($user->warehouse_id === $this->salesOrder->warehouse_id) {
                    return $user->hasRole(['Manager Jakarta', 'Manager Makassar', 'Admin Jakarta', 'Admin Makassar', 'Gudang']);
                }

                return false;
            });

        if ($targets->isEmpty()) {
            Log::info("No valid targets found for WA notification SO: {$soNumber}");
            return;
        }

        // 3. Send Notification to Individuals
        foreach ($targets as $user) {
            $waService->sendMessage(
                $user->phone_number,
                $message,
                $this->salesOrder,
                $user->name
            );
        }

        // 4. Send Notification to Group (if configured in .env)
        $groupId = config('services.whatsapp.group_id');
        if ($groupId) {
            try {
                $waService->sendMessage(
                    $groupId,
                    $message,
                    $this->salesOrder,
                    'WhatsApp Group',
                    true // isGroup = true
                );
            } catch (\Exception $e) {
                Log::error("Failed to send WhatsApp Group notification: " . $e->getMessage());
            }
        }
    }
}
