@extends('layouts.pdf-layout')

@section('title', 'Invoice')

@section('content')
<h2 class="title">Invoice</h2>

<table class="info-table">
  <tr><td>Invoice No.</td><td>: {{ $invoice['invoice_no'] }}</td></tr>
  <tr><td>Quotation No</td><td>: {{ $invoice['quotation_no'] }}</td></tr>
  <tr><td>Date</td><td>: {{ $invoice['date'] }}</td></tr>
  <tr><td>Customer</td><td>: {{ $invoice['customer_name'] }}</td></tr>
  <tr><td>Address</td><td>: {{ $invoice['customer_address'] }}</td></tr>
</table>

 <table class="data-table">
      <thead>
        <tr>
          <th>Part Number</th>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Disc</th>
          <th>Total Price</th>
        </tr>
      </thead>
    <tbody>
        @foreach($invoice['items'] as $i => $item)
        <tr>
          <td>{{ $item['part_number'] }}</td>
          <td style="text-align:left">{{ $item['description'] }}</td>
          <td>{{ $item['qty'] }}</td>
          <td>{{ number_format($item['unit_price'],0,',','.') }}</td>
          <td>{{ $item['disc'] }}%</td>
          <td>{{ number_format($item['total_price'],0,',','.') }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

 <table class="summary">
      <tr><td>Total</td><td>{{ number_format($invoice['total'],0,',','.') }}</td></tr>
      <tr><td>Tax</td><td>{{ number_format($invoice['tax'],0,',','.') }}</td></tr>
      <tr><td><strong>Grand Total</strong></td><td><strong>{{ number_format($invoice['grand_total'],0,',','.') }}</strong></td></tr>
    </table>
  </div>
@endsection
