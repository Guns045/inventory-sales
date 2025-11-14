@extends('layouts.pdf-layout')

@section('title', 'Picking List')

@section('content')

<h2 class="title">PICKING LIST</h2>

@if(isset($source_type) && $source_type === 'IT')
    {{-- INTERNAL TRANSFER TEMPLATE --}}
    <table class="info-table">
        <tr><td>Picking List No.</td><td>: {{ $pl['PL'] }}</td></tr>
        <tr><td>Transfer No</td><td>: {{ $pl['IT/SO'] }}</td></tr>
        <tr><td>Transfer Type</td><td>: Internal Transfer</td></tr>
        <tr><td>From Warehouse</td><td>: {{ $pl['warehouse'] }}</td></tr>
        <tr><td>To Warehouse</td><td>: {{ $pl['to_warehouse'] ?? '-' }}</td></tr>
        <tr><td>Date</td><td>: {{ $pl['date'] }}</td></tr>
        <tr><td>Picker</td><td>: {{ $pl['picker'] }}</td></tr>
        <tr><td>Status</td><td>: {{ $pl['status'] }}</td></tr>
    </table>
@else
    {{-- SALES ORDER TEMPLATE (Original) --}}
    <table class="info-table">
        <tr><td>Picking List No.</td><td>: {{ $pl['PL'] }}</td></tr>
        <tr><td>Process No</td><td>: {{ $pl['IT/SO'] }}</td></tr>
        <tr><td>Customer</td><td>: {{ $pl['customer_name'] ?? 'N/A' }}</td></tr>
        <tr><td>Warehouse</td><td>: {{ $pl['warehouse'] }}</td></tr>
        <tr><td>Date</td><td>: {{ $pl['date'] }}</td></tr>
    </table>
@endif

<table class="data-table">
    <thead>
        <tr>
            <th>No</th>
            <th>Part Number</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Location</th>
            @if(isset($source_type) && $source_type === 'IT')
            <th>Transfer Notes</th>
            @endif
        </tr>
    </thead>
    <tbody>
        @foreach($pl['items'] as $item)
        <tr>
            <td class="text-center">{{ $item['no'] ?? $loop->index + 1 }}</td>
            <td>{{ $item['part_number'] }}</td>
            <td>{{ $item['description'] }}</td>
            <td class="text-center">{{ $item['qty'] }}</td>
            <td class="text-center">{{ $item['unit'] ?? 'pcs' }}</td>
            <td class="text-center">{{ $item['location'] }}</td>
            @if(isset($source_type) && $source_type === 'IT')
            <td>{{ $item['notes'] ?? '-' }}</td>
            @endif
        </tr>
        @endforeach
    </tbody>
</table>

<div class="info-section">
    <div class="info-row">
        <div class="info-label"><strong>Picker:</strong></div>
        <div class="info-value">{{ $pl['picker'] }}</div>
    </div>
    <div class="info-row">
        <div class="info-label"><strong>Status:</strong></div>
        <div class="info-value">{{ $pl['status'] }}</div>
    </div>
    <div class="info-row">
        <div class="info-label"><strong>Priority:</strong></div>
        <div class="info-value">{{ $pl['priority'] }}</div>
    </div>
    @if($pl['target_time'] ?? null)
    <div class="info-row">
        <div class="info-label"><strong>Target Time:</strong></div>
        <div class="info-value">{{ $pl['target_time'] }}</div>
    </div>
    @endif
    @if($pl['notes'] ?? null)
    <div class="info-row">
        <div class="info-label"><strong>Notes:</strong></div>
        <div class="info-value">{{ $pl['notes'] }}</div>
    </div>
    @endif
</div>

@if(isset($source_type) && $source_type === 'IT')
    {{-- Internal Transfer Specific Sections --}}
    <div class="info-section" style="margin-top: 30px;">
        <h4 style="margin-bottom: 10px; text-align: center;">Transfer Information</h4>
        <div class="info-row">
            <div class="info-label"><strong>Transfer Number:</strong></div>
            <div class="info-value">{{ $pl['IT/SO'] }}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><strong>From:</strong></div>
            <div class="info-value">{{ $pl['warehouse'] }}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><strong>To:</strong></div>
            <div class="info-value">{{ $pl['to_warehouse'] ?? 'See Transfer Document' }}</div>
        </div>
    </div>
@endif
@endsection