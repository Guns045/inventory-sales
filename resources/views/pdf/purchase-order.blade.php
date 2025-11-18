@extends('layouts.pdf-layout')

@section('title', 'Purchase Order')

@section('content')
<h2 class="title">Purchase Order</h2>

<table class="info-table">
      <tr><td>PO Number</td><td>: {{ $purchaseOrder['number'] }}</td></tr>
      <tr><td>PO Date</td><td>: {{ $purchaseOrder['date'] }}</td></tr>
      <tr><td>Supplier Name</td><td>: {{ $purchaseOrder['supplier_name'] }}</td></tr>
      <tr><td>Supplier Address</td><td>: {{ $purchaseOrder['supplier_address'] }}</td></tr>
      <tr><td>Warehouse</td><td>: {{ $purchaseOrder['warehouse'] }}</td></tr>
      <tr><td>Expected Delivery</td><td>: {{ $purchaseOrder['expected_delivery'] }}</td></tr>
    </table>

    <table class="data-table">
      <thead>
        <tr>
          <th>Part Number</th>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total Price</th>
        </tr>
      </thead>
    <tbody>
        @foreach($purchaseOrder['items'] as $item)
        <tr>
          <td>{{ $item['part_number'] }}</td>
          <td style="text-align:left">{{ $item['description'] }}</td>
          <td>{{ number_format($item['qty'], 0, ',', '.') }}</td>
          <td>{{ number_format($item['unit_price'], 0, ',', '.') }}</td>
          <td>{{ number_format($item['total_price'], 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

 <table class="summary">
      <tr><td>Sub Total</td><td>{{ number_format($purchaseOrder['subtotal'], 0, ',', '.') }}</td></tr>
      <tr><td>Tax (PPN 11%)</td><td>{{ number_format($purchaseOrder['tax'], 0, ',', '.') }}</td></tr>
      <tr><td><strong>Grand Total</strong></td><td><strong>{{ number_format($purchaseOrder['grand_total'], 0, ',', '.') }}</strong></td></tr>
    </table>

    @if($purchaseOrder['notes'])
    <div style="margin-top: 20px;">
        <p><strong>Notes:</strong></p>
        <p>{{ $purchaseOrder['notes'] }}</p>
    </div>
    @endif
@endsection