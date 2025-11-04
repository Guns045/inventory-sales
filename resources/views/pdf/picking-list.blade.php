<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Picking List {{ $pickingList->picking_list_number }}</title>
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
            color: #e74c3c;
        }
        .subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .picking-info {
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        .info-block {
            width: 48%;
            margin-bottom: 15px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .customer-info, .sales-order-info {
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
        .status-pending { background-color: #fff3cd; color: #856404; }
        .status-partial { background-color: #cce5ff; color: #004085; }
        .status-completed { background-color: #d4edda; color: #155724; }

        .summary {
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .signature-area {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 45%;
            text-align: center;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            margin: 40px 0 10px 0;
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
        .urgent {
            color: #e74c3c;
            font-weight: bold;
        }
        .completion-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
        }
        @media print {
            body { font-size: 10px; }
            .header { margin-bottom: 20px; }
            .document-title { font-size: 20px; }
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
            PICKING LIST
        </div>
        <div class="subtitle">
            Dokumen Pengambilan Barang
        </div>
    </div>

    <div class="picking-info">
        <div class="info-block">
            <div class="info-row">
                <span><strong>Picking List Number:</strong></span>
                <span class="urgent">{{ $pickingList->picking_list_number }}</span>
            </div>
            <div class="info-row">
                <span><strong>Status:</strong></span>
                <span><span class="completion-badge" style="background-color: {{ $pickingList->status_color === 'green' ? '#d4edda' : ($pickingList->status_color === 'yellow' ? '#fff3cd' : ($pickingList->status_color === 'blue' ? '#cce5ff' : '#f8f9fa')) }}; color: {{ $pickingList->status_color === 'green' ? '#155724' : ($pickingList->status_color === 'yellow' ? '#856404' : ($pickingList->status_color === 'blue' ? '#004085' : '#6c757d')) }};">{{ $pickingList->status_label }}</span></span>
            </div>
            <div class="info-row">
                <span><strong>Created Date:</strong></span>
                <span>{{ date('d M Y H:i', strtotime($pickingList->created_at)) }}</span>
            </div>
            <div class="info-row">
                <span><strong>Created By:</strong></span>
                <span>{{ $pickingList->user->name }}</span>
            </div>
        </div>
        <div class="info-block">
            @if($pickingList->salesOrder)
            <div class="info-row">
                <span><strong>Sales Order Number:</strong></span>
                <span>{{ $pickingList->salesOrder->sales_order_number }}</span>
            </div>
            <div class="info-row">
                <span><strong>SO Status:</strong></span>
                <span>{{ $pickingList->salesOrder->status }}</span>
            </div>
            @elseif(str_contains($pickingList->notes, 'warehouse transfer:'))
            @php
                $transferNumber = str_replace('For warehouse transfer: ', '', $pickingList->notes);
            @endphp
            <div class="info-row">
                <span><strong>Transfer Number:</strong></span>
                <span class="urgent">{{ $transferNumber }}</span>
            </div>
            <div class="info-row">
                <span><strong>Transfer Type:</strong></span>
                <span>Internal Warehouse Transfer</span>
            </div>
            @else
            <div class="info-row">
                <span><strong>Type:</strong></span>
                <span>Manual Picking List</span>
            </div>
            @endif
            <div class="info-row">
                <span><strong>Completion Date:</strong></span>
                <span>{{ $pickingList->completed_at ? date('d M Y H:i', strtotime($pickingList->completed_at)) : '-' }}</span>
            </div>
            <div class="info-row">
                <span><strong>Priority:</strong></span>
                <span class="urgent">HIGH PRIORITY</span>
            </div>
        </div>
    </div>

    @if($pickingList->salesOrder)
    <div class="customer-info">
        <h3>Customer Information:</h3>
        <p><strong>{{ $pickingList->salesOrder->customer->company_name }}</strong></p>
        <p>Attn: {{ $pickingList->salesOrder->customer->contact_person }}</p>
        <p>{{ $pickingList->salesOrder->customer->address }}</p>
        <p>Telp: {{ $pickingList->salesOrder->customer->phone }} | Email: {{ $pickingList->salesOrder->customer->email }}</p>
    </div>
    @elseif(str_contains($pickingList->notes, 'warehouse transfer:'))
    <div class="customer-info">
        <h3>Transfer Information:</h3>
        <p><strong>Internal Warehouse Transfer</strong></p>
        <p><strong>Transfer Number:</strong> {{ str_replace('For warehouse transfer: ', '', $pickingList->notes) }}</p>
        <p><strong>Type:</strong> Stock movement between warehouses</p>
        <p><strong>Purpose:</strong> Internal inventory management</p>
    </div>
    @else
    <div class="customer-info">
        <h3>Information:</h3>
        <p><strong>Manual Picking List</strong></p>
        <p>No associated sales order or transfer</p>
    </div>
    @endif

    <h3>Items to Pick:</h3>
    <table class="items-table">
        <thead>
            <tr>
                <th class="text-center">No</th>
                <th>Location</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th class="text-center">Required</th>
                <th class="text-center">Picked</th>
                <th class="text-center">Remaining</th>
                <th class="text-center">Status</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            @foreach($pickingList->items as $index => $item)
            <tr class="{{ $item->status === 'COMPLETED' ? 'status-completed' : ($item->status === 'PARTIAL' ? 'status-partial' : 'status-pending') }}">
                <td class="text-center">{{ $index + 1 }}</td>
                <td class="text-center"><strong>{{ $item->location_code ?: '-' }}</strong></td>
                <td>{{ $item->product->sku }}</td>
                <td>{{ $item->product->name }}</td>
                <td class="text-center">{{ number_format($item->quantity_required) }}</td>
                <td class="text-center">{{ number_format($item->quantity_picked) }}</td>
                <td class="text-center urgent">{{ number_format($item->remaining_quantity) }}</td>
                <td class="text-center">
                    <span class="completion-badge" style="background-color: {{ $item->status_color === 'green' ? '#d4edda' : ($item->status_color === 'yellow' ? '#fff3cd' : '#f8f9fa') }}; color: {{ $item->status_color === 'green' ? '#155724' : ($item->status_color === 'yellow' ? '#856404' : '#6c757d') }};">
                        {{ $item->status_label }}
                    </span>
                </td>
                <td>{{ $item->notes ?: '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="summary">
        <h4>Summary:</h4>
        <div class="summary-row">
            <span><strong>Total Items:</strong></span>
            <span>{{ $pickingList->items->count() }} items</span>
        </div>
        <div class="summary-row">
            <span><strong>Total Quantity Required:</strong></span>
            <span>{{ number_format($pickingList->items->sum('quantity_required')) }} units</span>
        </div>
        <div class="summary-row">
            <span><strong>Total Quantity Picked:</strong></span>
            <span>{{ number_format($pickingList->items->sum('quantity_picked')) }} units</span>
        </div>
        <div class="summary-row">
            <span><strong>Total Remaining:</strong></span>
            <span class="urgent">{{ number_format($pickingList->items->sum('remaining_quantity')) }} units</span>
        </div>
        <div class="summary-row">
            <span><strong>Completion Progress:</strong></span>
            <span>{{ number_format($pickingList->items->where('status', 'COMPLETED')->count() / $pickingList->items->count() * 100, 1) }}%</span>
        </div>
    </div>

    @if($pickingList->notes)
    <div class="notes">
        <h4>Notes:</h4>
        <p>{{ $pickingList->notes }}</p>
    </div>
    @endif

    <div class="signature-area">
        <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Picker / Gudang</strong></p>
            <p>(_________________________)</p>
        </div>
        <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Checker / Supervisor</strong></p>
            <p>(_________________________)</p>
        </div>
    </div>

    <div class="footer">
        <p><strong>IMPORTANT INSTRUCTIONS:</strong></p>
        <p>1. Check all items carefully before picking</p>
        <p>2. Verify product codes and quantities match exactly</p>
        <p>3. Update actual quantities picked in the system</p>
        <p>4. Report any discrepancies immediately to supervisor</p>
        <p>5. Handle all items with care to prevent damage</p>
        <br>
        <p>This document must be completed and signed before items can be shipped</p>
        <p>&copy; {{ date('Y') }} PT. JINAN TEKNIK - Warehouse Management System</p>
    </div>
</body>
</html>