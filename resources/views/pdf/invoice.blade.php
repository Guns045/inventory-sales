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
      <td>Delivery No</td>
      <td>: {{ $invoice['delivery_no'] }}</td>
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

  @foreach($invoice['items_grouped'] ?? [['so_number' => $invoice['sales_order_no'], 'quotation_no' => $invoice['quotation_no'], 'items' => $invoice['items']]] as $group)
    <div class="so-group" style="margin-top: 15px;">
      <h4 style="margin-bottom: 5px; color: #333;">Quotation No: {{ $group['quotation_no'] }}
        @if(isset($group['po_number']) && $group['po_number'] !== '-' && !empty($group['po_number']))
          <span style="font-weight: normal; margin-left: 10px;">(PO: {{ $group['po_number'] }})</span>
        @endif
      </h4>
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
          @foreach($group['items'] as $item)
            <tr>
              <td>{{ $item['part_number'] }}</td>
              <td style="text-align:left">{{ $item['description'] }}</td>
              <td style="text-align:center">{{ $item['qty'] }}</td>
              <td style="text-align:right">{{ number_format($item['unit_price'], 0, ',', '.') }}</td>
              <td style="text-align:right">{{ $item['disc'] }}%</td>
              <td style="text-align:right">{{ number_format($item['total_price'], 0, ',', '.') }}</td>
            </tr>
          @endforeach
          @if(isset($invoice['items_grouped']) && count($invoice['items_grouped']) > 1)
            <tr style="background-color: #f9f9f9; font-weight: bold;">
              <td colspan="5" style="text-align: right;">Total</td>
              <td style="text-align: right;">{{ number_format($group['group_total'], 0, ',', '.') }}</td>
            </tr>
          @endif
        </tbody>
      </table>
    </div>
  @endforeach

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
@endsection