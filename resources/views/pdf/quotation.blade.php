<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quotation {{ $quotation->quotation_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
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
        }
        .quotation-info {
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
        .totals {
            text-align: right;
            margin-top: 20px;
        }
        .totals-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
        }
        .totals-label {
            width: 150px;
            text-align: right;
            padding-right: 20px;
            font-weight: bold;
        }
        .totals-value {
            width: 120px;
            text-align: right;
        }
        .footer {
            margin-top: 50px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .notes {
            margin-top: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>PT. JINAN TEKNIK</h1>
            <p>Jl. Industri No. 123, Jakarta | Telp: (021) 123-4567 | Email: info@jinan-technik.com</p>
        </div>
        <div class="document-title">
            QUOTATION
        </div>
    </div>

    <div class="quotation-info">
        <div class="info-row">
            <span><strong>Quotation Number:</strong> {{ $quotation->quotation_number }}</span>
            <span><strong>Date:</strong> {{ date('d M Y', strtotime($quotation->created_at)) }}</span>
        </div>
        <div class="info-row">
            <span><strong>Status:</strong> {{ $quotation->status }}</span>
            <span><strong>Valid Until:</strong> {{ date('d M Y', strtotime($quotation->valid_until)) }}</span>
        </div>
    </div>

    <div class="customer-info">
        <h3>Customer Information:</h3>
        <p><strong>{{ $quotation->customer->company_name }}</strong></p>
        <p>Attn: {{ $quotation->customer->contact_person }}</p>
        <p>{{ $quotation->customer->address }}</p>
        <p>Telp: {{ $quotation->customer->phone }} | Email: {{ $quotation->customer->email }}</p>
        <p>Tax ID: {{ $quotation->customer->tax_id }}</p>
    </div>

    <h3>Quotation Details:</h3>
    <table class="items-table">
        <thead>
            <tr>
                <th>No</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quotation->quotationItems as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item->product->sku }}</td>
                <td>{{ $item->product->name }}</td>
                <td>{{ $item->product->description }}</td>
                <td class="text-right">{{ number_format($item->quantity) }}</td>
                <td class="text-right">Rp {{ number_format($item->unit_price, 0, ',', '.') }}</td>
                <td class="text-right">{{ $item->discount_percentage }}%</td>
                <td class="text-right">{{ $item->tax_rate }}%</td>
                <td class="text-right">Rp {{ number_format($item->total_price, 0, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row">
            <div class="totals-label">Subtotal:</div>
            <div class="totals-value">Rp {{ number_format($quotation->subtotal, 0, ',', '.') }}</div>
        </div>
        <div class="totals-row">
            <div class="totals-label">Discount:</div>
            <div class="totals-value">Rp {{ number_format($quotation->discount, 0, ',', '.') }}</div>
        </div>
        <div class="totals-row">
            <div class="totals-label">Tax:</div>
            <div class="totals-value">Rp {{ number_format($quotation->tax, 0, ',', '.') }}</div>
        </div>
        <div class="totals-row" style="font-size: 16px; border-top: 2px solid #333; padding-top: 5px;">
            <div class="totals-label">TOTAL AMOUNT:</div>
            <div class="totals-value"><strong>Rp {{ number_format($quotation->total_amount, 0, ',', '.') }}</strong></div>
        </div>
    </div>

    @if($quotation->notes)
    <div class="notes">
        <h4>Notes:</h4>
        <p>{{ $quotation->notes }}</p>
    </div>
    @endif

    <div class="footer">
        <p>This quotation is valid until {{ date('d M Y', strtotime($quotation->valid_until)) }}</p>
        <p>Payment Terms: 50% Down Payment, 50% on Delivery</p>
        <p>Delivery: FOB Jakarta</p>
        <p>&copy; {{ date('Y') }} PT. JINAN TEKNIK - All Rights Reserved</p>
    </div>
</body>
</html>