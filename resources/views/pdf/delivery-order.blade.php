@extends('layouts.pdf-layout')

@section('title', 'Delivery Note')

@section('content')
    <h2 class="title">Delivery Note</h2>

    <table class="info-table">
        <tr>
            <td>Customer Name</td>
            <td>: {{ $delivery['customer_name'] }}</td>
        </tr>
        <tr>
            <td>Customer ID</td>
            <td>: {{ $delivery['customer_id'] }}</td>
        </tr>
        <tr>
            <td>Customer Address</td>
            <td>: {{ $delivery['customer_address'] }}</td>
        </tr>
        <tr>
            <td>Sales Order No.</td>
            <td>: {{ $delivery['sales_order_no'] }}</td>
        </tr>
        <tr>
            <td>Delivery Note No.</td>
            <td>: {{ $delivery['delivery_no'] }}</td>
        </tr>
        <tr><td>Delivery Date</td><td>: {{ $delivery['date'] }}</td></tr>
        <tr><td>Delivery Method</td><td>: {{ $delivery['delivery_method'] }} ({{ $delivery['delivery_vendor'] }})</td></tr>
        @if($delivery['tracking_number'] && $delivery['tracking_number'] !== '-')
        <tr><td>Tracking No</td><td>: {{ $delivery['tracking_number'] }}</td></tr>
        @endif
        <tr>
            <td>Driver</td>
            <td>: {{ $delivery['driver_name'] }}</td>
        </tr>
        <tr>
            <td>Vehicle</td>
            <td>: {{ $delivery['vehicle_plate'] }}</td>
        </tr>
        <tr>
            <td>Contact Person</td>
            <td>: {{ $delivery['contact_person'] }}</td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Part Number</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>PO Number</th>
                <th>Delivery Method</th>
                <th>Delivery Vendor</th>
            </tr>
        </thead>
        <tbody>
            @foreach($delivery['items'] as $i => $item)
                <tr>
                    <td>{{ $item['part_number'] }}</td>
                    <td>{{ $item['description'] }}</td>
                    <td class="text-center">{{ $item['quantity'] }}</td>
                    <td class="text-center">{{ $item['po_number'] }}</td>
                    <td class="text-center">{{ $item['delivery_method'] }}</td>
                    <td class="text-center">{{ $item['delivery_vendor'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

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
@endsection