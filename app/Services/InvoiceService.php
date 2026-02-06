<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\DeliveryOrder;
use App\Models\DocumentCounter;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Transformers\InvoiceTransformer;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class InvoiceService
{
    /**
     * Update overdue status for unpaid invoices
     *
     * @return int Number of invoices updated
     */
    public function updateOverdueStatus(): int
    {
        $overdueInvoices = Invoice::whereIn('status', ['UNPAID', 'PARTIAL'])
            ->whereDate('due_date', '<', Carbon::now()) // Strictly past due date
            ->get();

        $count = 0;
        foreach ($overdueInvoices as $invoice) {
            $invoice->update(['status' => 'OVERDUE']);

            ActivityLog::log(
                'UPDATE_INVOICE_STATUS',
                "System marked Invoice {$invoice->invoice_number} as OVERDUE",
                $invoice,
                ['status' => 'UNPAID'], // Assuming previous was UNPAID/PARTIAL
                ['status' => 'OVERDUE']
            );

            Notification::createForRole(
                config('inventory.roles.finance', 'Finance'),
                "Invoice {$invoice->invoice_number} is now OVERDUE",
                'warning',
                '/invoices'
            );

            $count++;
        }

        return $count;
    }

    /**
     * Create an invoice from a sales order
     *
     * @param int $salesOrderId
     * @param array $data
     * @return Invoice
     * @throws \Exception
     */
    public function createFromSalesOrder(int $salesOrderId, array $data): Invoice
    {
        return DB::transaction(function () use ($salesOrderId, $data) {
            $salesOrder = SalesOrder::with('salesOrderItems.product')->findOrFail($salesOrderId);

            // Calculate total amount from sales order items
            $totalAmount = 0;
            foreach ($salesOrder->salesOrderItems as $item) {
                $totalPrice = $item->quantity * $item->unit_price;
                $discountAmount = $totalPrice * ($item->discount_percentage / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item->tax_rate / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;
                $totalAmount += $totalPrice;
            }

            // Update PO Number if provided
            if (isset($data['po_number']) && !empty($data['po_number'])) {
                $salesOrder->update(['po_number' => $data['po_number']]);
            }

            // Get warehouse ID from sales order
            $warehouseId = $salesOrder->warehouse_id;
            if (!$warehouseId) {
                // Fallback to parsing from sales_order_number for existing records
                $parts = explode('/', $salesOrder->sales_order_number);
                $warehouseCode = count($parts) >= 2 ? $parts[1] : 'JKT';
                $warehouseId = ($warehouseCode === 'JKT')
                    ? config('inventory.warehouses.jkt', 1)
                    : config('inventory.warehouses.mks', 2);
            }

            // Generate invoice number
            $invoiceNumber = $this->generateInvoiceNumber($warehouseId);

            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'sales_order_id' => $salesOrderId,
                'customer_id' => $data['customer_id'],
                'warehouse_id' => $warehouseId,
                'issue_date' => $data['issue_date'],
                'due_date' => $this->calculateDueDate($data['issue_date'], $salesOrder->terms_of_payment),
                'status' => $data['status'],
                'total_amount' => $totalAmount,
            ]);

            // Create invoice items
            foreach ($salesOrder->salesOrderItems as $item) {
                $totalPrice = $item->quantity * $item->unit_price;
                $discountAmount = $totalPrice * ($item->discount_percentage / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item->tax_rate / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item->product_id,
                    'description' => $item->product->name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'discount_percentage' => $item->discount_percentage,
                    'tax_rate' => $item->tax_rate,
                    'total_price' => $totalPrice,
                ]);
            }

            // Update sales order status
            $salesOrder->update(['status' => 'COMPLETED']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Created Invoice',
                'description' => "Created invoice {$invoiceNumber} from sales order {$salesOrder->sales_order_number}",
                'reference_type' => 'Invoice',
                'reference_id' => $invoice->id,
            ]);

            return $invoice->load(['customer', 'salesOrder', 'invoiceItems.product']);
        });
    }

    /**
     * Create an invoice from a delivery order (Partial Invoicing)
     */
    public function createFromDeliveryOrder(int $deliveryOrderId, array $data): Invoice
    {
        return DB::transaction(function () use ($deliveryOrderId, $data) {
            $deliveryOrder = \App\Models\DeliveryOrder::with(['deliveryOrderItems.product', 'deliveryOrderItems.salesOrderItem.salesOrder'])->findOrFail($deliveryOrderId);
            $selectedSoIds = isset($data['selected_so_ids']) ? $data['selected_so_ids'] : null;

            // For consolidated DO, primary salesOrder might be the first one
            // We'll use it for terms of payment and customer default, but items will come from their respective SOs
            $primarySalesOrder = $deliveryOrder->salesOrder;

            // If selective invoicing is used, update primarySalesOrder to be the first selected one
            if ($selectedSoIds && count($selectedSoIds) > 0) {
                $firstSoId = $selectedSoIds[0];
                $primarySalesOrder = \App\Models\SalesOrder::find($firstSoId) ?: $primarySalesOrder;
            }

            // Calculate total amount based on DELIVERED QUANTITY
            $totalAmount = 0;
            $invoiceItemsData = [];

            foreach ($deliveryOrder->deliveryOrderItems as $doItem) {
                // Get SO item directly from the link (critical for consolidated DO)
                $soItem = $doItem->salesOrderItem;

                if (!$soItem) {
                    // Fallback to searching in primary SO if link is missing (for legacy data)
                    $soItem = $primarySalesOrder ? $primarySalesOrder->salesOrderItems->where('product_id', $doItem->product_id)->first() : null;
                }

                if (!$soItem)
                    continue;

                // Filter by selected SOs if provided
                if ($selectedSoIds && !in_array($soItem->sales_order_id, $selectedSoIds)) {
                    continue;
                }

                $quantity = $doItem->quantity_delivered; // Use delivered quantity

                if ($quantity <= 0)
                    continue;

                $unitPrice = $soItem->unit_price;
                $discountPercentage = $soItem->discount_percentage;
                $taxRate = $soItem->tax_rate;

                $totalPrice = $quantity * $unitPrice;
                $discountAmount = $totalPrice * ($discountPercentage / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($taxRate / 100);
                $finalPrice = $totalPrice - $discountAmount + $taxAmount;

                $totalAmount += $finalPrice;

                $invoiceItemsData[] = [
                    'sales_order_item_id' => $soItem->id,
                    'product_id' => $doItem->product_id,
                    'description' => $doItem->product->name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'discount_percentage' => $discountPercentage,
                    'tax_rate' => $taxRate,
                    'total_price' => $finalPrice,
                ];
            }

            // Update PO Number if provided (on the primary SO)
            if (isset($data['po_number']) && !empty($data['po_number']) && $primarySalesOrder) {
                $primarySalesOrder->update(['po_number' => $data['po_number']]);
            }

            $warehouseId = $deliveryOrder->warehouse_id;
            $invoiceNumber = $this->generateInvoiceNumber($warehouseId);

            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'sales_order_id' => $primarySalesOrder ? $primarySalesOrder->id : null,
                'delivery_order_id' => $deliveryOrderId,
                'customer_id' => $deliveryOrder->customer_id,
                'warehouse_id' => $warehouseId,
                'issue_date' => $data['issue_date'],
                'due_date' => $this->calculateDueDate($data['issue_date'], $primarySalesOrder ? $primarySalesOrder->terms_of_payment : null),
                'status' => $data['status'],
                'total_amount' => $totalAmount,
            ]);

            // Create invoice items
            foreach ($invoiceItemsData as $itemData) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    ...$itemData
                ]);
            }

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'Created Invoice',
                'description' => "Created invoice {$invoiceNumber} from delivery order {$deliveryOrder->delivery_order_number}",
                'reference_type' => 'Invoice',
                'reference_id' => $invoice->id,
            ]);

            return $invoice->load(['customer', 'salesOrder', 'deliveryOrder', 'invoiceItems.product']);
        });
    }

    /**
     * Update an invoice
     *
     * @param Invoice $invoice
     * @param array $data
     * @return Invoice
     */
    public function updateInvoice(Invoice $invoice, array $data): Invoice
    {
        DB::transaction(function () use ($invoice, $data) {
            $invoice->update($data);

            // Update PO Number on related Sales Order if provided
            if (isset($data['po_number'])) {
                $invoice->salesOrder()->update(['po_number' => $data['po_number']]);
            }
        });

        return $invoice->load(['customer', 'salesOrder', 'invoiceItems.product', 'warehouse']);
    }

    /**
     * Update invoice status with business validation
     *
     * @param Invoice $invoice
     * @param string $status
     * @param string|null $notes
     * @return Invoice
     * @throws \Exception
     */
    public function updateStatus(Invoice $invoice, string $status, ?string $notes = null): Invoice
    {
        $oldStatus = $invoice->status;

        // Business logic validation: Cannot change PAID invoice back to UNPAID or PARTIAL
        if ($oldStatus === 'PAID' && in_array($status, ['UNPAID', 'PARTIAL'])) {
            throw new \Exception('Cannot change PAID invoice back to UNPAID or PARTIAL status');
        }

        // Auto-update OVERDUE status based on due date
        if ($status === 'PARTIAL' && $invoice->due_date < now()) {
            $status = 'OVERDUE';
        }

        // Add status change tracking to notes
        $updatedNotes = $notes ?? $invoice->notes;
        if ($oldStatus !== $status) {
            $statusChangeNote = "Status changed from {$oldStatus} to {$status} on " . now()->format('Y-m-d H:i:s') . ".";
            $updatedNotes = $updatedNotes ? $updatedNotes . ' ' . $statusChangeNote : $statusChangeNote;
        }

        $invoice->update([
            'status' => $status,
            'notes' => $updatedNotes
        ]);

        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'Updated Invoice Status',
            'description' => "Changed invoice {$invoice->invoice_number} status from {$oldStatus} to {$status}",
            'reference_type' => 'Invoice',
            'reference_id' => $invoice->id,
        ]);

        return $invoice->load(['customer', 'salesOrder', 'invoiceItems.product', 'warehouse']);
    }

    /**
     * Generate PDF for invoice
     *
     * @param Invoice $invoice
     * @return mixed
     */
    public function generatePDF(Invoice $invoice)
    {
        $invoice->load([
            'customer',
            'salesOrder',
            'invoiceItems.product',
            'salesOrder.customer'
        ]);

        $companyData = InvoiceTransformer::getCompanyData();
        $invoiceData = InvoiceTransformer::transform($invoice);

        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'Printed Invoice',
            'description' => "Printed invoice {$invoice->invoice_number}",
            'reference_type' => 'Invoice',
            'reference_id' => $invoice->id,
        ]);

        $pdf = PDF::loadView('pdf.invoice', [
            'company' => $companyData,
            'invoice' => $invoiceData
        ]);

        return $pdf;
    }

    /**
     * Export invoices to CSV
     *
     * @param \Illuminate\Database\Eloquent\Collection $invoices
     * @return string
     */
    public function exportToCSV($invoices): string
    {
        $csvData = [];
        $csvData[] = ['Invoice Number', 'Customer', 'Issue Date', 'Due Date', 'Total Amount', 'Status', 'Sales Order'];

        foreach ($invoices as $invoice) {
            $csvData[] = [
                $invoice->invoice_number,
                $invoice->customer->company_name ?? $invoice->customer->name ?? 'N/A',
                $invoice->issue_date->format('Y-m-d'),
                $invoice->due_date->format('Y-m-d'),
                $invoice->total_amount,
                $invoice->status,
                $invoice->salesOrder->sales_order_number ?? 'N/A'
            ];
        }

        // Create CSV content
        $csv = '';
        foreach ($csvData as $row) {
            $csv .= implode(',', array_map(function ($field) {
                return '"' . str_replace('"', '""', $field) . '"';
            }, $row)) . "\n";
        }

        return $csv;
    }

    private function generateInvoiceNumber(int $warehouseId): string
    {
        return DocumentCounter::getNextNumber('INVOICE', $warehouseId);
    }

    /**
     * Calculate due date based on terms of payment
     */
    private function calculateDueDate($issueDate, $termsOfPayment)
    {
        $date = \Carbon\Carbon::parse($issueDate);

        if (!$termsOfPayment) {
            return $date->format('Y-m-d');
        }

        switch ($termsOfPayment) {
            case 'NET_15':
                return $date->addDays(15)->format('Y-m-d');
            case 'NET_30':
                return $date->addDays(30)->format('Y-m-d');
            case 'NET_45':
                return $date->addDays(45)->format('Y-m-d');
            case 'NET_60':
                return $date->addDays(60)->format('Y-m-d');
            case 'CASH':
            default:
                return $date->format('Y-m-d');
        }
    }
}
