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

class PurchaseOrderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $purchaseOrder;
    public $customMessage;
    public $transformedData;

    /**
     * Create a new message instance.
     */
    public function __construct(PurchaseOrder $purchaseOrder, $customMessage = null)
    {
        $this->purchaseOrder = $purchaseOrder;
        $this->customMessage = $customMessage;
        $this->transformedData = PurchaseOrderTransformer::transform($purchaseOrder);
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
            view: 'emails.purchase-order',
            with: [
                'purchaseOrder' => $this->purchaseOrder,
                'customMessage' => $this->customMessage,
                'transformedData' => $this->transformedData,
            ]
        );
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
        $companyData = PurchaseOrderTransformer::getCompanyData();

        // Generate PDF dengan DOMPDF
        $options = new \Dompdf\Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new \Dompdf\Dompdf($options);

        $html = view('pdf.purchase-order', [
            'purchaseOrder' => $this->transformedData,
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