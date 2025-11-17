<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\PurchaseOrder;
use App\Transformers\PurchaseOrderTransformer;

class PurchaseOrderMail extends Mailable
{
    use Queueable, SerializesModels;

    public $purchaseOrder;
    public $customMessage;

    /**
     * Create a new message instance.
     */
    public function __construct(PurchaseOrder $purchaseOrder, $customMessage = null)
    {
        $this->purchaseOrder = $purchaseOrder;
        $this->customMessage = $customMessage;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Purchase Order {$this->purchaseOrder->po_number} from PT. Jinan Truck Power Indonesia",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            html: $this->buildEmailContent(),
        );
    }

    /**
     * Build simple email content
     */
    private function buildEmailContent(): string
    {
        $content = "
        <p>Dear <strong>{$this->purchaseOrder->supplier->name}</strong>,</p>

        <p>PT. Jinan Truck Power Indonesia would like to place the following purchase order:</p>

        <p><strong>PO Number:</strong> {$this->purchaseOrder->po_number}<br>
        <strong>Total Amount:</strong> IDR " . number_format($this->purchaseOrder->total_amount, 0, ',', '.') . "<br>
        <strong>Expected Delivery:</strong> " . ($this->purchaseOrder->expected_delivery_date ? date('d/m/Y', strtotime($this->purchaseOrder->expected_delivery_date)) : 'To be confirmed') . "</p>

        <p>Please find the detailed Purchase Order PDF attached for your review and processing.</p>";

        if ($this->customMessage) {
            $content .= "<br><p><strong>Additional Message:</strong><br>" . nl2br(htmlspecialchars($this->customMessage)) . "</p>";
        }

        $content .= "
        <br><p>We appreciate your prompt attention to this order. Please acknowledge receipt and confirm delivery timeline.</p>

        <p>Best regards,<br>
        Purchasing Department<br>
        PT. Jinan Truck Power Indonesia</p>";

        return $content;
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [
            \Illuminate\Mail\Mailables\Attachment::fromPath(
                $this->generatePDF()
            )->as("Purchase Order - {$this->purchaseOrder->po_number}.pdf")
            ->withMime('application/pdf'),
        ];
    }

    /**
     * Generate PDF for the purchase order
     */
    private function generatePDF()
    {
        // Prepare company data
        $companyData = [
            'name' => 'PT. Jinan Truck Power Indonesia',
            'address' => 'Jl. Jakarta Raya No. 123, Jakarta Selatan, DKI Jakarta'
        ];

        // Transform data untuk template
        $purchaseOrderData = PurchaseOrderTransformer::transform($this->purchaseOrder);
        $companyData = PurchaseOrderTransformer::getCompanyData();

        // Generate PDF dengan DOMPDF
        $options = new \Dompdf\Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new \Dompdf\Dompdf($options);

        $html = view('pdf.purchase-order', [
            'purchaseOrder' => $purchaseOrderData,
            'company' => $companyData
        ])->render();

        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        // Generate filename
        $safeNumber = str_replace(['/', '\\'], '_', $this->purchaseOrder->po_number);
        $filename = "Purchase-Order-{$safeNumber}.pdf";
        $filepath = storage_path('app/purchase-orders/' . $filename);

        // Ensure directory exists
        $directory = dirname($filepath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        // Save to storage
        file_put_contents($filepath, $dompdf->output());

        return $filepath;
    }
}
