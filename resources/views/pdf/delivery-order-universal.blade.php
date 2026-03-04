@extends('layouts.pdf-layout')

@section('title', 'Delivery Note')

@section('content')
    <h2 class="title">DELIVERY NOTE</h2>

    @if(isset($source_type) && $source_type === 'IT')
        {{-- INTERNAL TRANSFER DELIVERY --}}
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                    <table class="info-table" style="margin-bottom: 0;">
                        <tr>
                            <td style="width: 130px;">Transfer Number</td>
                            <td>: {{ $delivery['transfer_no'] ?? 'N/A' }}</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">Delivery Note No.</td>
                            <td>: {{ $delivery['delivery_no'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">Transfer Type</td>
                            <td>: Internal Transfer</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">From Warehouse</td>
                            <td>: {{ $delivery['from_warehouse'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">To Warehouse</td>
                            <td>: {{ $delivery['to_warehouse'] }}</td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%; vertical-align: top;">
                    <table class="info-table" style="margin-bottom: 0;">
                        <tr>
                            <td style="width: 110px;">Delivery Date</td>
                            <td>: {{ $delivery['date'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 110px;">Driver Name</td>
                            <td>: {{ $delivery['driver_name'] ?? 'N/A' }}</td>
                        </tr>
                        <tr>
                            <td style="width: 110px;">Vehicle Plate</td>
                            <td>: {{ $delivery['vehicle_plate'] ?? 'N/A' }}</td>
                        </tr>
                        <tr>
                            <td style="width: 110px;">Contact Person</td>
                            <td>: {{ $delivery['contact_person'] ?? 'N/A' }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    @else
        {{-- SALES ORDER DELIVERY (Original) --}}
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                    <table class="info-table" style="margin-bottom: 0;">
                        <tr>
                            <td style="width: 130px;">Customer Name</td>
                            <td>: {{ $delivery['customer_name'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">Customer ID</td>
                            <td>: {{ $delivery['customer_id'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">Customer Address</td>
                            <td>: {{ $delivery['customer_address'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">Sales Order No.</td>
                            <td>: {{ $delivery['sales_order_no'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 130px;">Delivery Note No.</td>
                            <td>: {{ $delivery['delivery_no'] }}</td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%; vertical-align: top;">
                    <table class="info-table" style="margin-bottom: 0;">
                        <tr>
                            <td style="width: 110px;">Delivery Date</td>
                            <td>: {{ $delivery['date'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 110px;">Delivery Method</td>
                            <td>: {{ $delivery['delivery_method'] }} ({{ $delivery['delivery_vendor'] }})</td>
                        </tr>
                        @if($delivery['tracking_number'] && $delivery['tracking_number'] !== '-')
                            <tr>
                                <td style="width: 110px;">Tracking No</td>
                                <td>: {{ $delivery['tracking_number'] }}</td>
                            </tr>
                        @endif
                        <tr>
                            <td style="width: 110px;">Driver</td>
                            <td>: {{ $delivery['driver_name'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 110px;">Vehicle</td>
                            <td>: {{ $delivery['vehicle_plate'] }}</td>
                        </tr>
                        <tr>
                            <td style="width: 110px;">Contact Person</td>
                            <td>: {{ $delivery['contact_person'] }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    @endif

    @foreach($delivery['items_grouped'] ?? [['so_number' => $delivery['sales_order_no'], 'items' => $delivery['items']]] as $group)
        <div class="so-group" style="margin-top: 20px;">
            <h4 style="margin-bottom: 5px; color: #333;">SO Reference: {{ $group['so_number'] }}
                @if(isset($group['po_number']) && $group['po_number'] !== '-')
                    <span style="font-weight: normal; margin-left: 10px;">(PO: {{ $group['po_number'] }})</span>
                @endif
            </h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Part Number</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Weight (kg)</th>
                        @if(isset($source_type) && $source_type === 'IT')
                            <th>From Location</th>
                            <th>To Location</th>
                        @else
                            {{-- PO Number removed per previous request as it's now in the header above the table --}}
                        @endif
                    </tr>
                </thead>
                <tbody>
                    @foreach($group['items'] as $item)
                        <tr>
                            <td>{{ $item['part_number'] }}</td>
                            <td>{{ $item['description'] }}</td>
                            <td class="text-center">{{ $item['quantity'] }}</td>
                            <td class="text-center">
                                @if(isset($item['total_weight']) && $item['total_weight'] > 0)
                                    {{ number_format($item['total_weight'], 2) }}
                                @else
                                    -
                                @endif
                            </td>
                            @if(isset($source_type) && $source_type === 'IT')
                                <td class="text-center">{{ $item['from_location'] ?? $item['location'] ?? '-' }}</td>
                                <td class="text-center">{{ $item['to_location'] ?? '-' }}</td>
                            @else
                                {{-- PO Number removed per previous request --}}
                            @endif
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endforeach

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