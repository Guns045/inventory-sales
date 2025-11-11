<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>QUOTATION {{ $quotation->quotation_number }}</title>
    <style>
        @page {
            margin: 15mm;
            size: A4;
        }

        body {
            font-family: 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            margin: 0;
            padding: 0;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
        }

        .logo-area {
            flex: 1;
        }

        .company-info {
            flex: 1;
            text-align: right;
        }

        .company-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #000;
        }

        .company-details {
            font-size: 9px;
            line-height: 1.4;
        }

        .document-title {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            margin: 25px 0;
            letter-spacing: 1px;
        }

        .quotation-number {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .date-info {
            text-align: center;
            font-size: 11px;
            margin-bottom: 25px;
        }

        .content-section {
            display: flex;
            margin-bottom: 20px;
        }

        .customer-section {
            flex: 1;
            padding-right: 20px;
        }

        .quotation-details {
            flex: 1;
            padding-left: 20px;
        }

        .section-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
        }

        .info-item {
            margin-bottom: 5px;
            font-size: 10px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 10px;
        }

        .items-table th {
            background-color: #f0f0f0;
            border: 1px solid #000;
            padding: 6px 4px;
            text-align: center;
            font-weight: bold;
            font-size: 9px;
        }

        .items-table td {
            border: 1px solid #000;
            padding: 4px;
            vertical-align: top;
        }

        .description-cell {
            text-align: left;
            padding-left: 8px;
        }

        .number-cell {
            text-align: right;
            padding-right: 8px;
            font-family: 'Courier New', monospace;
        }

        .terms-section {
            margin: 25px 0;
            font-size: 9px;
        }

        .terms-title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 11px;
        }

        .terms-list {
            list-style-type: decimal;
            padding-left: 20px;
            line-height: 1.4;
        }

        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
        }

        .signature-box {
            width: 45%;
            text-align: center;
        }

        .signature-line {
            border-bottom: 1px solid #000;
            height: 40px;
            margin-bottom: 5px;
        }

        .signature-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 3px;
        }

        .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 8px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-area">
            <!-- Placeholder for logo -->
            <div style="width: 200px; height: 60px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">
                [COMPANY LOGO]
            </div>
        </div>
        <div class="company-info">
            <div class="company-name">PT. DAYA ADHIKARI KARYA</div>
            <div class="company-details">
                Graha Anugrah, Jl. Buncit Raya No. 43, Jakarta Selatan 12740<br>
                Phone: +62 21 798 0805 | +62 21 798 8035<br>
                Email: info@dayasadikari.com | Website: www.dayasadikari.com<br>
                NPWP: 01.347.692.6-054.000
            </div>
        </div>
    </div>

    <div class="document-title">QUOTATION</div>
    <div class="quotation-number">{{ $quotation->quotation_number }}</div>
    <div class="date-info">
        Date: {{ date('d F Y', strtotime($quotation->created_at)) }}
    </div>

    <div class="content-section">
        <div class="customer-section">
            <div class="section-title">TO:</div>
            <div class="info-item"><strong>Attention</strong></div>
            <div class="info-item">{{ $quotation->customer->contact_person ?? '-' }}</div>
            <div class="info-item" style="margin-top: 8px;"><strong>Company</strong></div>
            <div class="info-item">{{ $quotation->customer->company_name }}</div>
            <div class="info-item">{{ $quotation->customer->address }}</div>
            <div class="info-item">Phone: {{ $quotation->customer->phone ?? '-' }}</div>
        </div>
        <div class="quotation-details">
            <div class="section-title">FROM:</div>
            <div class="info-item"><strong>Attention</strong></div>
            <div class="info-item">{{ $quotation->user->name ?? 'Sales Team' }}</div>
            <div class="info-item" style="margin-top: 8px;"><strong>Company</strong></div>
            <div class="info-item">PT. DAYA ADHIKARI KARYA</div>
            <div class="info-item">Graha Anugrah, Jl. Buncit Raya No. 43, Jakarta Selatan 12740</div>
            <div class="info-item">Phone: +62 21 798 0805 | +62 21 798 8035</div>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">NO</th>
                <th style="width: 10%; text-align: left;">PART NUMBER</th>
                <th style="width: 35%; text-align: left;">DESCRIPTION</th>
                <th style="width: 8%;">QTY</th>
                <th style="width: 7%;">UNIT</th>
                <th style="width: 10%;">UNIT PRICE</th>
                <th style="width: 10%;">DISCOUNT</th>
                <th style="width: 15%;">AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quotation->quotationItems as $index => $item)
            <tr>
                <td style="text-align: center;">{{ $index + 1 }}</td>
                <td class="description-cell">{{ $item->product->sku ?? '-' }}</td>
                <td class="description-cell">
                    <strong>{{ $item->product->name }}</strong>
                    @if($item->product->description)
                        <br><span style="font-size: 9px; color: #666;">{{ $item->product->description }}</span>
                    @endif
                </td>
                <td style="text-align: center;">{{ number_format($item->quantity) }}</td>
                <td style="text-align: center;">{{ $item->product->unit ?? 'PCS' }}</td>
                <td class="number-cell">Rp {{ number_format($item->unit_price, 0, ',', '.') }}</td>
                <td class="number-cell">{{ $item->discount_percentage ?? 0 }}%</td>
                <td class="number-cell">Rp {{ number_format($item->total_price, 0, ',', '.') }}</td>
            </tr>
            @endforeach

            <!-- Subtotal Row -->
            <tr>
                <td colspan="7" style="text-align: right; font-weight: bold; padding-right: 15px;">SUBTOTAL</td>
                <td class="number-cell">Rp {{ number_format($quotation->subtotal, 0, ',', '.') }}</td>
            </tr>

            <!-- VAT Row -->
            <tr>
                <td colspan="7" style="text-align: right; padding-right: 15px;">VAT 11%</td>
                <td class="number-cell">Rp {{ number_format($quotation->tax, 0, ',', '.') }}</td>
            </tr>

            <!-- Total Row -->
            <tr style="border-top: 2px solid #000;">
                <td colspan="7" style="text-align: right; font-weight: bold; padding-right: 15px;">TOTAL</td>
                <td class="number-cell" style="font-weight: bold;">Rp {{ number_format($quotation->total_amount, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="terms-section">
        <div class="terms-title">TERM & CONDITION:</div>
        <ol class="terms-list">
            <li>Prices quoted are valid for 30 days from date of Quotation</li>
            <li>Prices quoted are not inclusive of VAT and other taxes unless otherwise specified</li>
            <li>Prices quoted are not inclusive of packing material and freight cost</li>
            <li>All payment should be made via Bank Transfer to our account below</li>
            <li>Delivery shall be made after the Purchase Order is received and confirmed</li>
            <li>Delivery is limited to Jakarta area. Outside Jakarta is excluding transport cost</li>
            <li>All item are not refundable and exchangeable</li>
        </ol>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-title">Regards,</div>
            <div class="signature-line"></div>
            <div>{{ $quotation->user->name ?? 'Sales Team' }}</div>
            <div style="font-size: 9px;">{{ $quotation->user->email ?? 'sales@dayasadikari.com' }}</div>
        </div>
        <div class="signature-box">
            <div class="signature-title">Accepted by:</div>
            <div class="signature-line"></div>
            <div>______________________________</div>
            <div style="font-size: 9px;">(Authorized Signature & Company Stamp)</div>
        </div>
    </div>

    <div class="footer">
        <strong>Bank Account:</strong><br>
        Bank Central Asia - KCU Ampera<br>
        Account Name: PT. Daya Adhikari Karya<br>
        Account No: 888.0888999<br>
        Swift Code: CENAIDJA
    </div>
</body>
</html>