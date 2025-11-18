<p>Dear <strong>{{ $purchaseOrder->supplier->name }}</strong>,</p>

<p>PT. Jinan Truck Power Indonesia would like to place the following purchase order:</p>

<p><strong>PO Number:</strong> {{ $purchaseOrder->po_number }}<br>
<strong>Total Amount:</strong> IDR {{ number_format($transformedData['grand_total'], 0, ',', '.') }}<br>
<strong>Expected Delivery:</strong> {{ $purchaseOrder->expected_delivery_date ? \Carbon\Carbon::parse($purchaseOrder->expected_delivery_date)->format('d/m/Y') : 'To be confirmed' }}</p>

<p>Please find the detailed Purchase Order PDF attached for your review and processing.</p>

@if($customMessage)
<br><p><strong>Additional Message:</strong><br>{!! nl2br(htmlspecialchars($customMessage)) !!}</p>
@endif

<br><p>We appreciate your prompt attention to this order. Please acknowledge receipt and confirm delivery timeline.</p>

<p>Best regards,<br>
Purchasing Department<br>
PT. Jinan Truck Power Indonesia</p>