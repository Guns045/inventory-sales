@extends('layouts.pdf-layout')

@section('title', 'Picking List')

@section('content')
<h2 class="title">Picking List</h2>

<table class="info-table">
  <tr><td>Picking List No.</td><td>: {{ $pl['PL'] }}</td></tr>
  <tr><td>Process No</td><td>: {{ $pl['IT/SO'] }}</td></tr>
  <tr><td>Customer</td><td>: {{ $pl['customer_name'] ?? 'N/A' }}</td></tr>
  <tr><td>Warehouse</td><td>: {{ $pl['warehouse'] }}</td></tr>
  <tr><td>Date</td><td>: {{ $pl['date'] }}</td></tr>
</table>

<table class="data-table">
  <thead>
    <tr>
      <th>No</th>
      <th>Part Number</th>
      <th>Description</th>
      <th>Qty</th>
      <th>Location</th>
    </tr>
  </thead>
  <tbody>
    @foreach($pl['items'] as $item)
    <tr>
      <td class="text-center">{{ $item['no'] }}</td>
      <td>{{ $item['part_number'] }}</td>
      <td>{{ $item['description'] }}</td>
      <td class="text-center">{{ $item['qty'] }}</td>
      <td class="text-center">{{ $item['location'] }}</td>
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
    @if($pl['notes'])
    <div class="info-row">
        <div class="info-label"><strong>Notes:</strong></div>
        <div class="info-value">{{ $pl['notes'] }}</div>
    </div>
    @endif
</div>
@endsection
