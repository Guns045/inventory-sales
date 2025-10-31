<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\ProductStock;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class PickingListController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = PickingList::with(['salesOrder.customer', 'user', 'items.product'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('picking_list_number', 'like', "%{$search}%")
                  ->orWhereHas('salesOrder', function($subQ) use ($search) {
                      $subQ->where('sales_order_number', 'like', "%{$search}%");
                  });
            });
        }

        $pickingLists = $query->paginate(10);
        return response()->json($pickingLists);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($request->sales_order_id);

            if ($salesOrder->status !== 'PENDING') {
                throw new \Exception('Sales Order is not in PENDING status.');
            }

            $existingPickingList = PickingList::where('sales_order_id', $request->sales_order_id)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->first();

            if ($existingPickingList) {
                throw new \Exception('Picking List already exists for this Sales Order.');
            }

            $pickingList = PickingList::create([
                'picking_list_number' => PickingList::generateNumber(),
                'sales_order_id' => $salesOrder->id,
                'user_id' => auth()->id(),
                'status' => 'READY',
                'notes' => $request->notes,
            ]);

            foreach ($salesOrder->items as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)
                    ->first();

                PickingListItem::create([
                    'picking_list_id' => $pickingList->id,
                    'product_id' => $item->product_id,
                    'warehouse_id' => $productStock?->warehouse_id,
                    'location_code' => $productStock?->location_code ?? $item->product->location_code ?? null,
                    'quantity_required' => $item->quantity,
                    'quantity_picked' => 0,
                    'status' => 'PENDING',
                ]);
            }

            $salesOrder->update(['status' => 'PROCESSING']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Created picking list ' . $pickingList->picking_list_number . ' from sales order ' . $salesOrder->sales_order_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Picking List Created',
                'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been created for Sales Order ' . $salesOrder->sales_order_number,
                'type' => 'info',
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
                'read' => false,
            ]);

            DB::commit();

            return response()->json($pickingList->load(['salesOrder.customer', 'user', 'items.product']), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error creating Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $pickingList = PickingList::with([
            'salesOrder.customer',
            'salesOrder.items.product',
            'items.product',
            'items.warehouse',
            'user'
        ])->findOrFail($id);

        return response()->json($pickingList);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.quantity_picked' => 'required|integer|min:0',
            'items.*.location_code' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $pickingList = PickingList::findOrFail($id);

            if (!in_array($pickingList->status, ['READY', 'PICKING'])) {
                throw new \Exception('Cannot edit Picking List in current status.');
            }

            $allCompleted = true;
            $hasUpdates = false;

            foreach ($request->items as $itemId => $itemData) {
                $pickingListItem = $pickingList->items()->findOrFail($itemId);

                $oldQuantity = $pickingListItem->quantity_picked;
                $newQuantity = $itemData['quantity_picked'];

                if ($oldQuantity != $newQuantity) {
                    $hasUpdates = true;
                }

                $status = 'PENDING';
                if ($newQuantity >= $pickingListItem->quantity_required) {
                    $status = 'COMPLETED';
                } elseif ($newQuantity > 0) {
                    $status = 'PARTIAL';
                }

                $pickingListItem->update([
                    'quantity_picked' => $newQuantity,
                    'location_code' => $itemData['location_code'] ?? $pickingListItem->location_code,
                    'notes' => $itemData['notes'] ?? $pickingListItem->notes,
                    'status' => $status,
                ]);

                if ($status !== 'COMPLETED') {
                    $allCompleted = false;
                }
            }

            $newStatus = $allCompleted ? 'COMPLETED' : ($hasUpdates ? 'PICKING' : $pickingList->status);

            $pickingList->update([
                'notes' => $request->notes,
                'status' => $newStatus,
                'completed_at' => $allCompleted ? now() : $pickingList->completed_at,
            ]);

            if ($allCompleted) {
                $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);

                // Log activity
                ActivityLog::create([
                    'user_id' => auth()->id(),
                    'activity' => 'Completed picking list ' . $pickingList->picking_list_number,
                    'module' => 'Picking List',
                    'data_id' => $pickingList->id,
                ]);

                // Create notification
                Notification::create([
                    'user_id' => auth()->id(),
                    'title' => 'Picking List Completed',
                    'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been completed and is ready to ship',
                    'type' => 'success',
                    'module' => 'Picking List',
                    'data_id' => $pickingList->id,
                    'read' => false,
                ]);
            }

            DB::commit();

            return response()->json($pickingList->load(['salesOrder.customer', 'user', 'items.product']));

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error updating Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $pickingList = PickingList::findOrFail($id);

            if ($pickingList->status === 'COMPLETED') {
                throw new \Exception('Cannot delete completed Picking List.');
            }

            $pickingList->salesOrder->update(['status' => 'PENDING']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Deleted picking list ' . $pickingList->picking_list_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            $pickingList->delete();

            DB::commit();

            return response()->json(['message' => 'Picking List deleted successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error deleting Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get items for a specific picking list
     */
    public function getItems($id)
    {
        $pickingList = PickingList::with(['items.product', 'items.warehouse'])->findOrFail($id);
        return response()->json($pickingList->items);
    }

    /**
     * Print picking list as PDF
     */
    public function print($id)
    {
        $pickingList = PickingList::with([
            'salesOrder.customer',
            'items.product',
            'items.warehouse',
            'user'
        ])->findOrFail($id);

        $pdf = PDF::loadView('pdf.picking-list', compact('pickingList'));
        $filename = "PickingList-{$pickingList->picking_list_number}.pdf";

        return $pdf->stream($filename);
    }

    /**
     * Complete picking list
     */
    public function complete($id)
    {
        try {
            DB::beginTransaction();

            $pickingList = PickingList::findOrFail($id);

            if ($pickingList->status !== 'PICKING') {
                throw new \Exception('Picking List is not in PICKING status.');
            }

            $allItemsCompleted = $pickingList->items()
                ->where('status', '!=', 'COMPLETED')
                ->count() === 0;

            if (!$allItemsCompleted) {
                throw new \Exception('Not all items are completed.');
            }

            $pickingList->update([
                'status' => 'COMPLETED',
                'completed_at' => now(),
            ]);

            $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Completed picking list ' . $pickingList->picking_list_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Picking List Completed',
                'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been completed and is ready to ship',
                'type' => 'success',
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
                'read' => false,
            ]);

            DB::commit();

            return response()->json($pickingList->load(['salesOrder.customer', 'user', 'items.product']));

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error completing Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get picking lists that are ready for delivery order creation
     */
    public function getAvailableForDelivery()
    {
        $availablePickingLists = PickingList::with(['salesOrder.customer', 'items.product'])
            ->where('status', 'COMPLETED')
            ->whereDoesntHave('deliveryOrders')
            ->orderBy('completed_at', 'desc')
            ->get();

        return response()->json($availablePickingLists);
    }
}