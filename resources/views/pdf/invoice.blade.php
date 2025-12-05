@extends('layouts.pdf-layout')

@section('title', 'Invoice')

@section('content')
  <h2 class="title">Invoice</h2>

  <table class="info-table">
    <tr>
      <td>Invoice No.</td>
      <td>: {{ $invoice['invoice_no'] }}</td>
    </tr>
    <tr>
      <td>Quotation No</td>
      <td>: {{ $invoice['quotation_no'] }}</td>
    </tr>
    <tr>
      <td>Date</td>
      <td>: {{ $invoice['date'] }}</td>
    </tr>
    <tr>
      <td>Customer</td>
      <td>: {{ $invoice['customer_name'] }}</td>
    </tr>
    <tr>
      <td>PO Customer</td>
      <td>: {{ $invoice['po_number'] }}</td>
    </tr>
    <tr>
      <td>Address</td>
      <td>: {{ $invoice['customer_address'] }}</td>
    </tr>
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
      @foreach($invoice['items'] as $item)
        <tr>
          <td>{{ $item['part_number'] }}</td>
          <td style="text-align:left">{{ $item['description'] }}</td>
          <td>{{ $item['qty'] }}</td>
          <td>{{ number_format($item['unit_price'], 0, ',', '.') }}</td>
          <td>{{ $item['disc'] }}%</td>
          <td>{{ number_format($item['total_price'], 0, ',', '.') }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>

  <div style="margin-top: 5px;">
    <div style="float: left; width: 55%; margin-top: 20px;">
      <strong>Payment Information :</strong>
      <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
        <tr>
          <td style="width: 100px;">Bank BCA</td>
          <td>: 194 0514 505</td>
        </tr>
        <tr>
          <td>Bank Mandiri</td>
          <td>: 1190 0029 2000 5</td>
        </tr>
        <tr>
          <td>Account Name</td>
          <td>: PT. Jinan Truck Power Indonesia</td>
        </tr>
      </table>
    </div>
    <div style="float: right; width: 30%;">
      <table class="summary" style="width: 100%;">
        <tr>
          <td>Total</td>
          <td>{{ number_format($invoice['total'], 0, ',', '.') }}</td>
        </tr>
        <tr>
          <td>Tax</td>
          <td>{{ number_format($invoice['tax'], 0, ',', '.') }}</td>
        </tr>
        <tr>
          <td><strong>Grand Total</strong></td>
          <td><strong>{{ number_format($invoice['grand_total'], 0, ',', '.') }}</strong></td>
        </tr>
      </table>
    </div>
    <div style="clear: both;"></div>
  </div>
  </div>
@endsection