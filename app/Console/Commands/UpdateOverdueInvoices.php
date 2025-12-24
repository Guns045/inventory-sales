<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\InvoiceService;

class UpdateOverdueInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:update-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update status of unpaid invoices to OVERDUE if due date has passed';

    /**
     * Execute the console command.
     */
    public function handle(InvoiceService $invoiceService)
    {
        $this->info('Checking for overdue invoices...');

        try {
            $count = $invoiceService->updateOverdueStatus();
            $this->info("Successfully updated {$count} invoices to OVERDUE status.");
        } catch (\Exception $e) {
            $this->error("Error updating overdue invoices: " . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
