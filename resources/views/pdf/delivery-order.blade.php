<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Delivery Order - {{ $deliveryOrder->delivery_order_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .document-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
            text-decoration: underline;
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-box {
            border: 1px solid #ddd;
            padding: 10px;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            background-color: #f5f5f5;
            padding: 5px;
        }
        .info-row {
            margin-bottom: 5px;
        }
        .info-label {
            font-weight: bold;
            display: inline-block;
            width: 100px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .footer {
            margin-top: 50px;
        }
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 30px;
        }
        .signature-box {
            text-align: center;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            margin: 40px 0 5px 0;
            height: 30px;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-preparing { background-color: #e3f2fd; color: #1976d2; }
        .status-ready { background-color: #e8f5e8; color: #388e3c; }
        .status-shipped { background-color: #fff3e0; color: #f57c00; }
        .status-delivered { background-color: #e8f5e8; color: #2e7d32; }
        .status-cancelled { background-color: #ffebee; color: #d32f2f; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">PT. JINAN INVENTORY SYSTEM</div>
        <div>Delivery Order</div>
    </div>

    <div class="document-title text-center">
        SURAT JALAN / DELIVERY ORDER
    </div>

    <div class="info-section">
        <div class="info-grid">
            <div class="info-box">
                <h3>Delivery Order Information</h3>
                <div class="info-row">
                    <span class="info-label">Number:</span>
                    {{ $deliveryOrder->delivery_order_number }}
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    {{ $deliveryOrder->created_at->format('d M Y') }}
                </div>
                <div class="info-row">
                    <span class="info-label">Shipping Date:</span>
                    {{ $deliveryOrder->shipping_date ? $deliveryOrder->shipping_date->format('d M Y') : '-' }}
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="status-badge status-{{ strtolower($deliveryOrder->status) }}">
                        {{ $deliveryOrder->status_label }}
                    </span>
                </div>
                @if($deliveryOrder->pickingList)
                <div class="info-row">
                    <span class="info-label">Picking List:</span>
                    {{ $deliveryOrder->pickingList->picking_list_number }}
                </div>
                @endif
            </div>

            <div class="info-box">
                <h3>Shipping Information</h3>
                <div class="info-row">
                    <span class="info-label">Driver Name:</span>
                    {{ $deliveryOrder->driver_name ?: '-' }}
                </div>
                <div class="info-row">
                    <span class="info-label">Vehicle Plate:</span>
                    {{ $deliveryOrder->vehicle_plate_number ?: '-' }}
                </div>
                <div class="info-row">
                    <span class="info-label">Contact Person:</span>
                    {{ $deliveryOrder->shipping_contact_person ?: '-' }}
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    {{ $deliveryOrder->customer->phone ?? $deliveryOrder->customer->contact_person ?? '-' }}
                </div>
            </div>
        </div>

        <div class="info-box">
            <h3>Customer Information</h3>
            <div class="info-grid">
                <div>
                    <div class="info-row">
                        <span class="info-label">Customer:</span>
                        {{ $deliveryOrder->customer->company_name ?? $deliveryOrder->customer->name }}
                    </div>
                    <div class="info-row">
                        <span class="info-label">Code:</span>
                        {{ $deliveryOrder->customer->customer_code ?? '-' }}
                    </div>
                </div>
                <div>
                    <div class="info-row">
                        <span class="info-label">Address:</span>
                        {{ $deliveryOrder->shipping_address ?: $deliveryOrder->customer->address }}
                    </div>
                    <div class="info-row">
                        <span class="info-label">City:</span>
                        {{ $deliveryOrder->shipping_city ?: $deliveryOrder->customer->city }}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <h3>Delivery Items</h3>
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Location</th>
                <th class="text-right">Qty Shipped</th>
                <th class="text-right">Qty Delivered</th>
                <th>Status</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            @forelse($deliveryOrder->deliveryOrderItems as $index => $item)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td>{{ $item->product->sku ?? $item->product->product_code ?? '-' }}</td>
                <td>{{ $item->product->name }}</td>
                <td>{{ $item->location_code ?: '-' }}</td>
                <td class="text-right">{{ number_format($item->quantity_shipped) }}</td>
                <td class="text-right">{{ number_format($item->quantity_delivered) }}</td>
                <td>
                    <span class="status-badge status-{{ strtolower($item->status) }}">
                        {{ $item->status_label }}
                    </span>
                </td>
                <td>{{ $item->notes ?: '-' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="8" class="text-center">No items found</td>
            </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr>
                <th colspan="4" class="text-right">Total:</th>
                <th class="text-right">{{ number_format($deliveryOrder->deliveryOrderItems->sum('quantity_shipped')) }}</th>
                <th class="text-right">{{ number_format($deliveryOrder->deliveryOrderItems->sum('quantity_delivered')) }}</th>
                <th colspan="2"></th>
            </tr>
        </tfoot>
    </table>

    @if($deliveryOrder->notes)
    <div class="info-box">
        <h3>Notes</h3>
        <p>{{ $deliveryOrder->notes }}</p>
    </div>
    @endif

    <div class="footer">
        <div class="signature-section">
            <div class="signature-box">
                <div>Prepared By</div>
                <div class="signature-line"></div>
                <div>{{ $deliveryOrder->createdBy ? $deliveryOrder->createdBy->name : '-' }}</div>
                <div>Warehouse Staff</div>
            </div>

            <div class="signature-box">
                <div>Driver / Courier</div>
                <div class="signature-line"></div>
                <div>{{ $deliveryOrder->driver_name ?: '-' }}</div>
                <div>Signature</div>
            </div>

            <div class="signature-box">
                <div>Received By</div>
                <div class="signature-line"></div>
                <div>(_________________________)</div>
                <div>Customer Signature</div>
            </div>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
            This document is electronically generated and valid without signature.
            <br>
            Generated on: {{ now()->format('d M Y H:i:s') }}
        </div>
    </div>
</body>
</html>