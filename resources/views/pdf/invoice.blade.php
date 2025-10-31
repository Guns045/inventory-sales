<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .company-info {
            text-align: center;
            margin-bottom: 20px;
        }
        .document-title {
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
            color: #e74c3c;
        }
        .invoice-info {
            margin-bottom: 30px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .customer-info, .company-details {
            margin-bottom: 30px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .items-table .text-right {
            text-align: right;
        }
        .items-table .text-center {
            text-align: center;
        }
        .total-section {
            margin-top: 20px;
            text-align: right;
        }
        .total-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
        }
        .total-label {
            width: 150px;
            padding-right: 20px;
            text-align: right;
            font-weight: bold;
        }
        .total-value {
            width: 120px;
            text-align: right;
        }
        .grand-total {
            border-top: 2px solid #333;
            padding-top: 5px;
            font-size: 14px;
            font-weight: bold;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 11px;
            color: #666;
        }
        .notes {
            margin-top: 30px;
            font-style: italic;
            color: #666;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-paid {
            background-color: #d4edda;
            color: #155724;
        }
        .status-unpaid {
            background-color: #fff3cd;
            color: #856404;
        }
        .status-overdue {
            background-color: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h2>PT. JINAN INDO MAKMUR</h2>
            <p>Jl. Raya Industrial No. 123, Jakarta, Indonesia</p>
            <p>Telp: (021) 1234567 | Email: info@jinanindo.com</p>
        </div>
        <div class="document-title">INVOICE</div>
    </div>

    <div class="invoice-info">
        <div class="info-row">
            <div>
                <strong>Invoice Number:</strong> {{ $invoice->invoice_number }}<br>
                <strong>Sales Order:</strong> {{ $invoice->salesOrder->sales_order_number ?? 'N/A' }}<br>
                <strong>Status:</strong>
                <span class="status status-{{ strtolower($invoice->status) }}">
                    {{ $invoice->status }}
                </span>
            </div>
            <div style="text-align: right;">
                <strong>Issue Date:</strong> {{ \Carbon\Carbon::parse($invoice->issue_date)->format('d/m/Y') }}<br>
                <strong>Due Date:</strong> {{ \Carbon\Carbon::parse($invoice->due_date)->format('d/m/Y') }}<br>
                <strong>Created:</strong> {{ \Carbon\Carbon::parse($invoice->created_at)->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>

    <div class="customer-info">
        <h4>Bill To:</h4>
        <p>
            <strong>{{ $invoice->customer->name ?? $invoice->salesOrder->customer->name ?? 'N/A' }}</strong><br>
            {{ $invoice->customer->address ?? $invoice->salesOrder->customer->address ?? '-' }}<br>
            {{ $invoice->customer->phone ?? $invoice->salesOrder->customer->phone ?? '-' }}<br>
            {{ $invoice->customer->email ?? $invoice->salesOrder->customer->email ?? '-' }}
        </p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="20%">Product Code</th>
                <th width="35%">Description</th>
                <th width="10%" class="text-center">Qty</th>
                <th width="15%" class="text-right">Unit Price</th>
                <th width="10%" class="text-center">Disc (%)</th>
                <th width="15%" class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @php $totalAmount = 0; @endphp
            @foreach($invoice->invoiceItems as $index => $item)
                @php
                    $totalPrice = $item->quantity * $item->unit_price;
                    $discountAmount = $totalPrice * ($item->discount_percentage / 100);
                    $taxAmount = ($totalPrice - $discountAmount) * ($item->tax_rate / 100);
                    $finalPrice = $totalPrice - $discountAmount + $taxAmount;
                    $totalAmount += $finalPrice;
                @endphp
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item->product->product_code ?? 'N/A' }}</td>
                    <td>{{ $item->description }}</td>
                    <td class="text-center">{{ number_format($item->quantity, 0) }}</td>
                    <td class="text-right">Rp {{ number_format($item->unit_price, 0, ',', '.') }}</td>
                    <td class="text-center">{{ $item->discount_percentage }}%</td>
                    <td class="text-right">Rp {{ number_format($finalPrice, 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <div class="total-label">Subtotal:</div>
            <div class="total-value">Rp {{ number_format($totalAmount, 0, ',', '.') }}</div>
        </div>
        <div class="total-row">
            <div class="total-label">VAT (11%):</div>
            <div class="total-value">Rp {{ number_format($totalAmount * 0.11, 0, ',', '.') }}</div>
        </div>
        <div class="total-row grand-total">
            <div class="total-label">Grand Total:</div>
            <div class="total-value">Rp {{ number_format($totalAmount * 1.11, 0, ',', '.') }}</div>
        </div>
    </div>

    @if($invoice->notes)
        <div class="notes">
            <strong>Notes:</strong><br>
            {{ $invoice->notes }}
        </div>
    @endif

    <div class="footer">
        <p>This is a computer-generated invoice and does not require a signature.</p>
        <p>Thank you for your business! Payment is due within {{ \Carbon\Carbon::parse($invoice->due_date)->diffInDays(\Carbon\Carbon::parse($invoice->issue_date)) }} days.</p>
    </div>
</body>
</html>