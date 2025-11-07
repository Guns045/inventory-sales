<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\SalesOrder;
use App\Models\ProductStock;
use App\Traits\DocumentNumberHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class PickingListController extends Controller
{
    use DocumentNumberHelper;
    public function index(Request $request)
    {
        $query = PickingList::with(['salesOrder.customer', 'user'])
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

        $pickingLists = $query->paginate($request->get('per_page', 10));

        return response()->json([
            'data' => $pickingLists->items(),
            'meta' => [
                'current_page' => $pickingLists->currentPage(),
                'last_page' => $pickingLists->lastPage(),
                'per_page' => $pickingLists->perPage(),
                'total' => $pickingLists->total(),
            ]
        ]);
    }

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

            $existingPickingList = PickingList::where('sales_order_id', $salesOrder->id)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->first();

            if ($existingPickingList) {
                throw new \Exception('Picking List already exists for this Sales Order.');
            }

            // Determine warehouse ID based on user or default to MKS
            $warehouseId = $this->getUserWarehouseIdForPicking(auth()->user());

            $pickingList = PickingList::create([
                'picking_list_number' => $this->generatePickingListNumber($warehouseId),
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

            DB::commit();

            $pickingList->load(['salesOrder.customer', 'items.product', 'user']);

            return response()->json([
                'message' => 'Picking List created successfully!',
                'data' => $pickingList
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error creating Picking List: ' . $e->getMessage()
            ], 400);
        }
    }

    public function show(PickingList $pickingList)
    {
        $pickingList->load([
            'salesOrder.customer',
            'salesOrder.items.product',
            'items.product',
            'items.warehouse',
            'user'
        ]);

        return response()->json([
            'data' => $pickingList
        ]);
    }

    public function update(Request $request, PickingList $pickingList)
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

            $pickingList->update([
                'notes' => $request->notes,
                'status' => $allCompleted ? 'COMPLETED' : ($hasUpdates ? 'PICKING' : $pickingList->status),
                'completed_at' => $allCompleted ? now() : $pickingList->completed_at,
            ]);

            if ($allCompleted) {
                $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);
            }

            DB::commit();

            $pickingList->load(['salesOrder.customer', 'items.product', 'user']);

            return response()->json([
                'message' => 'Picking List updated successfully!',
                'data' => $pickingList
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error updating Picking List: ' . $e->getMessage()
            ], 400);
        }
    }

    public function destroy(PickingList $pickingList)
    {
        try {
            DB::beginTransaction();

            if ($pickingList->status === 'COMPLETED') {
                throw new \Exception('Cannot delete completed Picking List.');
            }

            $pickingList->salesOrder->update(['status' => 'PENDING']);

            $pickingList->delete();

            DB::commit();

            return response()->json([
                'message' => 'Picking List deleted successfully!'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error deleting Picking List: ' . $e->getMessage()
            ], 400);
        }
    }

    public function print(PickingList $pickingList)
    {
        $pickingList->load([
            'salesOrder.customer',
            'items.product',
            'items.warehouse',
            'user'
        ]);

        $pdf = PDF::loadView('pdf.picking-list', compact('pickingList'));

        // Safe filename for all document types - replace invalid characters
        $filename = "PickingList_" . str_replace(['/', '\\'], '_', $pickingList->picking_list_number) . ".pdf";

        return $pdf->download($filename);
    }

    public function complete(PickingList $pickingList)
    {
        try {
            DB::beginTransaction();

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

            DB::commit();

            $pickingList->load(['salesOrder.customer', 'items.product', 'user']);

            return response()->json([
                'message' => 'Picking List marked as completed!',
                'data' => $pickingList
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error completing Picking List: ' . $e->getMessage()
            ], 400);
        }
    }

    public function getItems(PickingList $pickingList)
    {
        $items = $pickingList->items()
            ->with(['product', 'warehouse'])
            ->get();

        return response()->json([
            'data' => $items
        ]);
    }

    /**
     * Get warehouse code based on user role for picking lists (default to MKS)
     *
     * @param User $user
     * @return string
     */
    private function getUserWarehouseIdForPicking($user)
    {
        // Check if user has a specific warehouse assignment
        if ($user->warehouse_id) {
            return $user->warehouse_id;
        }

        // Check if user can access all warehouses, default to MKS (ID: 2)
        if ($user->canAccessAllWarehouses()) {
            return 2; // MKS Warehouse ID
        }

        // Check role-based defaults
        if ($user->role) {
            switch ($user->role->name) {
                case 'Warehouse Manager Gudang JKT':
                    return 1; // JKT Warehouse ID
                case 'Warehouse Manager Gudang MKS':
                    return 2; // MKS Warehouse ID
                case 'Super Admin':
                case 'Admin':
                    return 2; // Default to MKS for Picking Lists
                case 'Warehouse Staff':
                    return $user->warehouse_id ?: 2; // User's warehouse or MKS
            }
        }

        // Default to MKS for picking lists
        return 2;
    }
}
