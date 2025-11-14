@extends('layouts.pdf-layout')

@section('title', 'Delivery Note')

@section('content')
<h2 class="title">DELIVERY NOTE</h2>

@if(isset($source_type) && $source_type === 'IT')
    {{-- INTERNAL TRANSFER DELIVERY --}}
    <table class="info-table">
        <tr><td>Transfer Number</td><td>: {{ $delivery['transfer_no'] ?? 'N/A' }}</td></tr>
        <tr><td>Delivery Note No.</td><td>: {{ $delivery['delivery_no'] }}</td></tr>
        <tr><td>Transfer Type</td><td>: Internal Transfer</td></tr>
        <tr><td>From Warehouse</td><td>: {{ $delivery['from_warehouse'] }}</td></tr>
        <tr><td>To Warehouse</td><td>: {{ $delivery['to_warehouse'] }}</td></tr>
        <tr><td>Delivery Date</td><td>: {{ $delivery['date'] }}</td></tr>
        <tr><td>Driver Name</td><td>: {{ $delivery['driver_name'] ?? 'N/A' }}</td></tr>
        <tr><td>Vehicle Plate</td><td>: {{ $delivery['vehicle_plate'] ?? 'N/A' }}</td></tr>
        <tr><td>Contact Person</td><td>: {{ $delivery['contact_person'] ?? 'N/A' }}</td></tr>
        <tr><td>Notes</td><td>: {{ $delivery['notes'] ?? '-' }}</td></tr>
    </table>
@else
    {{-- SALES ORDER DELIVERY (Original) --}}
    <table class="info-table">
        <tr><td>Customer Name</td><td>: {{ $delivery['customer_name'] }}</td></tr>
        <tr><td>Customer ID</td><td>: {{ $delivery['customer_id'] }}</td></tr>
        <tr><td>Customer Address</td><td>: {{ $delivery['customer_address'] }}</td></tr>
        <tr><td>Sales Order No.</td><td>: {{ $delivery['sales_order_no'] }}</td></tr>
        <tr><td>Delivery Note No.</td><td>: {{ $delivery['delivery_no'] }}</td></tr>
        <tr><td>Delivery Date</td><td>: {{ $delivery['date'] }}</td></tr>
        <tr><td>Driver</td><td>: {{ $delivery['driver_name'] }}</td></tr>
        <tr><td>Vehicle</td><td>: {{ $delivery['vehicle_plate'] }}</td></tr>
        <tr><td>Contact Person</td><td>: {{ $delivery['contact_person'] }}</td></tr>
    </table>
@endif

<table class="data-table">
    <thead>
        <tr>
            <th>Part Number</th>
            <th>Description</th>
            <th>Quantity</th>
            @if(isset($source_type) && $source_type === 'IT')
            <th>From Location</th>
            <th>To Location</th>
            @else
            <th>PO Number</th>
            <th>Delivery Method</th>
            <th>Delivery Vendor</th>
            @endif
        </tr>
    </thead>
    <tbody>
        @foreach($delivery['items'] as $item)
        <tr>
            <td>{{ $item['part_number'] }}</td>
            <td>{{ $item['description'] }}</td>
            <td class="text-center">{{ $item['quantity'] }}</td>
            @if(isset($source_type) && $source_type === 'IT')
            <td class="text-center">{{ $item['from_location'] ?? $item['location'] ?? '-' }}</td>
            <td class="text-center">{{ $item['to_location'] ?? '-' }}</td>
            @else
            <td class="text-center">{{ $item['po_number'] }}</td>
            <td class="text-center">{{ $item['delivery_method'] }}</td>
            <td class="text-center">{{ $item['delivery_vendor'] }}</td>
            @endif
        </tr>
        @endforeach
    </tbody>
</table>

@if(isset($source_type) && $source_type === 'IT')
    {{-- Internal Transfer Signature Section --}}
    <div class="sign-section">
        <h4 style="text-align: center; margin-bottom: 20px;">Transfer Confirmation</h4>
        <table>
            <tr>
                <td class="sign-box">
                    <strong>Pengirim</strong>
                    <div class="signature-line"></div>
                    <small>{{ $delivery['from_warehouse'] }}</small>
                </td>
                <td class="sign-box">
                    <strong>Penerima</strong>
                    <div class="signature-line"></div>
                    <small>{{ $delivery['to_warehouse'] }}</small>
                </td>
            </tr>
        </table>
        @if($delivery['recipient_name'] ?? null)
        <div style="margin-top: 30px; text-align: center;">
            <p><strong>Diterima oleh:</strong> {{ $delivery['recipient_name'] }}
            @if($delivery['recipient_title'] ?? null)
            <br><small>Jabatan: {{ $delivery['recipient_title'] }}</small>
            @endif
            </p>
        </div>
        @endif
    </div>
@else
    {{-- Sales Order Signature Section (Original) --}}
    <div class="sign-section">
        <table>
            <tr>
                <td class="sign-box">
                    <strong>Pengirim</strong>
                    <div class="signature-line"></div>
                    <small>{{ $company['name'] }}</small>
                </td>
                <td class="sign-box">
                    <strong>Penerima</strong>
                    <div class="signature-line"></div>
                    <small>{{ $delivery['customer_name'] }}</small>
                </td>
            </tr>
        </table>
    </div>
@endif
@endsection