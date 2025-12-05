@extends('layouts.pdf-layout')

@section('title', 'Quotation')

@section('content')
  <h2 class="title">Quotation</h2>

  <table class="info-table">
    <tr>
      <td>Quotation No</td>
      <td>: {{ $quotation['number'] }}</td>
    </tr>
    <tr>
      <td>Quotation Date</td>
      <td>: {{ $quotation['date'] }}</td>
    </tr>
    <tr>
      <td>Customer Name</td>
      <td>: {{ $quotation['customer_name'] }}</td>
    </tr>
    @if(!empty($quotation['po_number']))
      <tr>
        <td>PO Customer</td>
        <td>: {{ $quotation['po_number'] }}</td>
      </tr>
    @else
      <tr>
        <td>Customer ID</td>
        <td>: {{ $quotation['customer_id'] }}</td>
      </tr>
    @endif
    <tr>
      <td>Customer Address</td>
      <td>: {{ $quotation['customer_address'] }}</td>
    </tr>
    <tr>
      <td>Franco</td>
      <td>: {{ $quotation['franco'] }}</td>
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
      @foreach($quotation['items'] as $i => $item)
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

  <table class="summary">
    <tr>
      <td>Total</td>
      <td>{{ number_format($quotation['total'], 0, ',', '.') }}</td>
    </tr>
    <tr>
      <td>Tax</td>
      <td>{{ number_format($quotation['tax'], 0, ',', '.') }}</td>
    </tr>
    <tr>
      <td><strong>Grand Total</strong></td>
      <td><strong>{{ number_format($quotation['grand_total'], 0, ',', '.') }}</strong></td>
    </tr>
  </table>

  <div class="sign-section">
    <table>
      <tr>
        <td class="sign-box">
          <strong>Requested By</strong>
          <div class="signature-line"></div>
          <small>{{ $quotation['customer_name'] }}</small>
        </td>
        <td class="sign-box">
          <strong>Prepared By</strong>
          <div class="signature-line"></div>
          <small>{{ $quotation['sales_person'] }}</small>
        </td>
      </tr>
    </table>
  </div>
@endsection