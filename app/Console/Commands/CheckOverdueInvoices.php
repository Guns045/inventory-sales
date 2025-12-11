<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckOverdueInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for overdue invoices and update their status';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for overdue invoices...');

        $overdueInvoices = \App\Models\Invoice::whereIn('status', ['UNPAID', 'PARTIAL'])
            ->where('due_date', '<', now()->format('Y-m-d'))
            ->get();

        $count = 0;
        foreach ($overdueInvoices as $invoice) {
            $invoice->update(['status' => 'OVERDUE']);

            // Log activity
            \App\Models\ActivityLog::create([
                'user_id' => null, // System action
                'action' => 'Marked Overdue',
                'description' => "Invoice {$invoice->invoice_number} marked as overdue by system",
                'reference_type' => 'Invoice',
                'reference_id' => $invoice->id,
            ]);

            $count++;
        }

        $this->info("Found and updated {$count} overdue invoices.");
    }
}
