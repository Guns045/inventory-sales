<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\ProductStock;
use Illuminate\Support\Facades\DB;

class DeliveryOrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $deliveryOrders = DeliveryOrder::with(['customer', 'salesOrder', 'deliveryOrderItems.product'])->paginate(10);
        return response()->json($deliveryOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'customer_id' => 'required|exists:customers,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'status' => 'required|in:PREPARING,SHIPPED,DELIVERED',
        ]);

        $deliveryOrder = DB::transaction(function () use ($request) {
            $deliveryOrder = DeliveryOrder::create([
                'delivery_order_number' => 'SJ-' . date('Y-m') . '-' . str_pad(DeliveryOrder::count() + 1, 4, '0', STR_PAD_LEFT),
                'sales_order_id' => $request->sales_order_id,
                'customer_id' => $request->customer_id,
                'shipping_date' => $request->shipping_date,
                'shipping_contact_person' => $request->shipping_contact_person,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->shipping_city,
                'driver_name' => $request->driver_name,
                'vehicle_plate_number' => $request->vehicle_plate_number,
                'status' => $request->status,
            ]);

            // Create delivery order items from the sales order items
            $salesOrder = SalesOrder::findOrFail($request->sales_order_id);
            $salesOrderItems = $salesOrder->salesOrderItems;

            $totalAmount = 0;
            foreach ($salesOrderItems as $item) {
                DeliveryOrderItem::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'product_id' => $item->product_id,
                    'quantity_shipped' => $item->quantity,
                ]);

                $totalAmount += $item->quantity * $item->unit_price;
            }

            // Update the sales order status to shipped
            $salesOrder->update(['status' => 'SHIPPED']);

            return $deliveryOrder->refresh();
        });

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $deliveryOrder = DeliveryOrder::with(['customer', 'salesOrder', 'deliveryOrderItems.product'])->findOrFail($id);
        return response()->json($deliveryOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $deliveryOrder = DeliveryOrder::findOrFail($id);

        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'customer_id' => 'required|exists:customers,id',
            'shipping_date' => 'nullable|date',
            'shipping_contact_person' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate_number' => 'nullable|string|max:20',
            'status' => 'required|in:PREPARING,SHIPPED,DELIVERED',
        ]);

        $deliveryOrder->update($request->all());

        return response()->json($deliveryOrder->load(['customer', 'salesOrder', 'deliveryOrderItems.product']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $deliveryOrder = DeliveryOrder::findOrFail($id);
        $deliveryOrder->delete();

        return response()->json(['message' => 'Delivery Order deleted successfully']);
    }

    public function getDeliveryOrderItems($id)
    {
        $deliveryOrder = DeliveryOrder::with('deliveryOrderItems.product')->findOrFail($id);
        return response()->json($deliveryOrder->deliveryOrderItems);
    }
}
