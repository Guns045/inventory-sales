<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\WarehouseTransfer;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\PickingList;
use App\Models\DeliveryOrder;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WarehouseTransferController extends Controller
{

    /**
     * Display a listing of warehouse transfers.
     */
    public function index(Request $request)
    {
        $query = WarehouseTransfer::with([
            'product',
            'warehouseFrom',
            'warehouseTo',
            'requestedBy',
            'approvedBy',
            'deliveredBy',
            'receivedBy'
        ]);

        // Filter by user warehouse if user is warehouse staff
        $query->forUser($request->user());

        // Filter by warehouse if specified
        if ($request->warehouse_from) {
            $query->fromWarehouse($request->warehouse_from);
        }
        if ($request->warehouse_to) {
            $query->toWarehouse($request->warehouse_to);
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->date_from) {
            $query->whereDate('requested_at', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('requested_at', '<=', $request->date_to);
        }

        $transfers = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($transfers);
    }

    /**
     * Store a newly created warehouse transfer in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'warehouse_from_id' => 'required|exists:warehouses,id',
            'warehouse_to_id' => 'required|exists:warehouses,id|different:warehouse_from_id',
            'quantity_requested' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:500',
        ]);

        // Check if user can create transfers from the source warehouse
        $user = $request->user();

        // Check warehouse access permissions
        if (!$user->canManageWarehouse($validated['warehouse_from_id'])) {
            return response()->json([
                'message' => 'You can only create transfers from warehouses you have access to'
            ], 403);
        }

        // Check if user has permission to create transfers
        if (!$user->hasPermission('transfers', 'create')) {
            return response()->json([
                'message' => 'You do not have permission to create transfers'
            ], 403);
        }

        try {
            DB::beginTransaction();

            $transfer = WarehouseTransfer::create([
                'transfer_number' => null, // Will be auto-generated
                'product_id' => $validated['product_id'],
                'warehouse_from_id' => $validated['warehouse_from_id'],
                'warehouse_to_id' => $validated['warehouse_to_id'],
                'quantity_requested' => $validated['quantity_requested'],
                'notes' => $validated['notes'],
                'requested_by' => $user->id,
                'status' => 'REQUESTED',
            ]);

            // Log activity
            ActivityLog::log(
                'WAREHOUSE_TRANSFER_REQUESTED',
                "User {$user->name} created warehouse transfer {$transfer->transfer_number} for {$transfer->quantity_requested} units",
                $transfer
            );

            // Notify warehouse from (JKT) about new transfer request
            Notification::createForRole(
                'Gudang',
                "New warehouse transfer request: {$transfer->transfer_number} - {$transfer->quantity_requested} units needed",
                'info',
                '/warehouse/transfers'
            );

            DB::commit();

            return response()->json([
                'message' => 'Warehouse transfer request created successfully',
                'transfer' => $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'requestedBy'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create warehouse transfer: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified warehouse transfer.
     */
    public function show($id)
    {
        $transfer = WarehouseTransfer::with([
            'product',
            'warehouseFrom',
            'warehouseTo',
            'requestedBy',
            'approvedBy',
            'deliveredBy',
            'receivedBy'
        ])->findOrFail($id);

        // Check if user can view this transfer
        $user = request()->user();
        if ($user->role === 'Gudang' && $user->warehouse_id) {
            if ($transfer->warehouse_from_id != $user->warehouse_id && $transfer->warehouse_to_id != $user->warehouse_id) {
                return response()->json([
                    'message' => 'You can only view transfers involving your warehouse'
                ], 403);
            }
        }

        return response()->json($transfer);
    }

    /**
     * Approve warehouse transfer request.
     */
    public function approve(Request $request, $id)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:500'
        ]);

        $transfer = WarehouseTransfer::findOrFail($id);
        $user = $request->user();

        // Check if user can approve transfers
        if (!$user->canApproveTransfers()) {
            return response()->json([
                'message' => 'You do not have permission to approve transfers'
            ], 403);
        }

        // Check warehouse access permissions
        if (!$user->canManageWarehouse($transfer->warehouse_from_id)) {
            return response()->json([
                'message' => 'You can only approve transfers from warehouses you have access to'
            ], 403);
        }

        if (!$transfer->canBeApproved()) {
            return response()->json([
                'message' => 'This transfer cannot be approved'
            ], 422);
        }

        if (!$transfer->hasSufficientStock()) {
            return response()->json([
                'message' => 'Insufficient stock available. Available: ' . $transfer->getAvailableStock() . ', Requested: ' . $transfer->quantity_requested
            ], 422);
        }

        try {
            DB::beginTransaction();

            $transfer->update([
                'status' => 'APPROVED',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'notes' => $validated['notes'],
            ]);

            // Create picking list
            $pickingList = PickingList::create([
                'sales_order_id' => null, // Not associated with sales order
                'user_id' => $user->id,
                'status' => 'DRAFT',
                'notes' => "For warehouse transfer: {$transfer->transfer_number}",
            ]);

            // Add item to picking list
            $pickingList->items()->create([
                'product_id' => $transfer->product_id,
                'warehouse_id' => $transfer->warehouse_from_id,
                'location_code' => null, // Can be added later
                'quantity_required' => $transfer->quantity_requested,
                'quantity_picked' => 0,
                'status' => 'PENDING',
            ]);

            // Log activity
            ActivityLog::log(
                'WAREHOUSE_TRANSFER_APPROVED',
                "User {$user->name} approved warehouse transfer {$transfer->transfer_number}",
                $transfer
            );

            // Notify warehouse to about approved transfer
            Notification::createForRole(
                'Gudang',
                "Warehouse transfer approved: {$transfer->transfer_number} - Ready for picking",
                'success',
                '/picking-lists'
            );

            DB::commit();

            return response()->json([
                'message' => 'Warehouse transfer approved successfully',
                'transfer' => $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'approvedBy']),
                'picking_list' => $pickingList
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to approve transfer: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create delivery order and update transfer status.
     */
    public function deliver(Request $request, $id)
    {
        $transfer = WarehouseTransfer::findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'quantity_delivered' => 'required|integer|min:1|max:' . $transfer->quantity_requested,
            'notes' => 'nullable|string|max:500'
        ]);

        // Check if user can deliver from the source warehouse
        if ($user->role === 'Gudang' && $user->warehouse_id != $transfer->warehouse_from_id) {
            return response()->json([
                'message' => 'You can only deliver transfers from your assigned warehouse'
            ], 403);
        }

        if (!$transfer->canBeDelivered()) {
            return response()->json([
                'message' => 'This transfer cannot be delivered'
            ], 422);
        }

        if ($validated['quantity_delivered'] > $transfer->quantity_requested) {
            return response()->json([
                'message' => 'Delivered quantity cannot exceed requested quantity'
            ], 422);
        }

        try {
            DB::beginTransaction();

            $transfer->update([
                'status' => 'IN_TRANSIT',
                'quantity_delivered' => $validated['quantity_delivered'],
                'delivered_by' => $user->id,
                'delivered_at' => now(),
                'notes' => $validated['notes'],
            ]);

            // Create delivery order
            // For warehouse transfers, we need to handle the required foreign keys differently
            $defaultCustomer = \App\Models\Customer::first();

            // Find an existing sales order to reuse, or create a minimal one
            $existingSalesOrder = \App\Models\SalesOrder::where('customer_id', $defaultCustomer->id)->first();
            if (!$existingSalesOrder) {
                $existingSalesOrder = \App\Models\SalesOrder::create([
                    'sales_order_number' => 'SO-INTERNAL-' . time(),
                    'customer_id' => $defaultCustomer->id,
                    'user_id' => $user ? $user->id : 1, // Fallback to user ID 1 if user is null
                    'status' => 'COMPLETED',
                    'order_date' => now(),
                    'delivery_date' => now(),
                    'subtotal' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 0,
                    'notes' => 'Internal transfer reference: ' . $transfer->transfer_number,
                ]);
            }

            $deliveryOrder = DeliveryOrder::create([
                'sales_order_id' => $existingSalesOrder->id, // Use existing or created sales order
                'customer_id' => $defaultCustomer->id, // Use default customer for internal transfers
                'status' => 'PREPARING', // Use valid enum value for delivery orders
                'notes' => "For warehouse transfer: {$transfer->transfer_number}",
                'created_by' => $user ? $user->id : 1, // Fallback to user ID 1 if user is null
            ]);

            // Add item to delivery order
            $deliveryOrder->deliveryOrderItems()->create([
                'product_id' => $transfer->product_id,
                'quantity_shipped' => $validated['quantity_delivered'],
                'status' => 'PREPARING', // Add status for delivery order item
                'notes' => "Transfer from {$transfer->warehouseFrom->name} to {$transfer->warehouseTo->name}",
            ]);

            // Reduce stock from source warehouse
            $productStock = ProductStock::where('product_id', $transfer->product_id)
                ->where('warehouse_id', $transfer->warehouse_from_id)
                ->first();

            if ($productStock) {
                $productStock->decrement('quantity', $validated['quantity_delivered']);

                // Log stock movement
                StockMovement::create([
                    'product_id' => $transfer->product_id,
                    'warehouse_id' => $transfer->warehouse_from_id,
                    'type' => 'OUT', // Use valid enum value
                    'quantity_change' => -$validated['quantity_delivered'],
                    'reference_id' => $transfer->id,
                    'reference_type' => WarehouseTransfer::class,
                    'notes' => "Warehouse transfer: {$transfer->transfer_number} - {$transfer->warehouseTo->name}",
                ]);
            }

            // Log activity
            ActivityLog::log(
                'WAREHOUSE_TRANSFER_DELIVERED',
                "User {$user->name} delivered {$validated['quantity_delivered']} units for transfer {$transfer->transfer_number}",
                $transfer
            );

            // Notify warehouse to about incoming delivery
            Notification::createForRole(
                'Gudang',
                "Incoming delivery: {$deliveryOrder->delivery_order_number} from {$transfer->warehouseFrom->name}",
                'info',
                '/delivery-orders'
            );

            DB::commit();

            return response()->json([
                'message' => 'Delivery order created successfully',
                'transfer' => $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'deliveredBy']),
                'delivery_order' => $deliveryOrder
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create delivery order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Receive goods and update stock.
     */
    public function receive(Request $request, $id)
    {
        $transfer = WarehouseTransfer::findOrFail($id);

        $validated = $request->validate([
            'quantity_received' => 'required|integer|min:1|max:' . $transfer->quantity_delivered,
            'notes' => 'nullable|string|max:500'
        ]);
        $user = $request->user();

        // Check if user can receive at the destination warehouse
        if ($user->role === 'Gudang' && $user->warehouse_id != $transfer->warehouse_to_id) {
            return response()->json([
                'message' => 'You can only receive transfers at your assigned warehouse'
            ], 403);
        }

        if (!$transfer->canBeReceived()) {
            return response()->json([
                'message' => 'This transfer cannot be received'
            ], 422);
        }

        if ($validated['quantity_received'] > $transfer->quantity_delivered) {
            return response()->json([
                'message' => 'Received quantity cannot exceed delivered quantity'
            ], 422);
        }

        try {
            DB::beginTransaction();

            $transfer->update([
                'status' => 'RECEIVED',
                'quantity_received' => $validated['quantity_received'],
                'received_by' => $user->id,
                'received_at' => now(),
                'notes' => $validated['notes'],
            ]);

            // Update delivery order status
            $deliveryOrder = DeliveryOrder::where('notes', 'like', "%{$transfer->transfer_number}%")
                ->first();

            if ($deliveryOrder) {
                $deliveryOrder->update(['status' => 'DELIVERED']);
            }

            // Add stock to destination warehouse
            $productStock = ProductStock::where('product_id', $transfer->product_id)
                ->where('warehouse_id', $transfer->warehouse_to_id)
                ->first();

            if ($productStock) {
                $productStock->increment('quantity', $validated['quantity_received']);
            } else {
                // Create new stock record if it doesn't exist
                ProductStock::create([
                    'product_id' => $transfer->product_id,
                    'warehouse_id' => $transfer->warehouse_to_id,
                    'quantity' => $validated['quantity_received'],
                    'reserved_quantity' => 0,
                ]);
            }

            // Log stock movement
            StockMovement::create([
                'product_id' => $transfer->product_id,
                'warehouse_id' => $transfer->warehouse_to_id,
                'type' => 'IN',
                'quantity_change' => $validated['quantity_received'],
                'reference_id' => $transfer->id,
                'reference_type' => WarehouseTransfer::class,
                'notes' => "Warehouse transfer received: {$transfer->transfer_number} from {$transfer->warehouseFrom->name}",
            ]);

            // Log activity
            ActivityLog::log(
                'WAREHOUSE_TRANSFER_RECEIVED',
                "User {$user->name} received {$validated['quantity_received']} units for transfer {$transfer->transfer_number}",
                $transfer
            );

            // Notify warehouse from about received goods
            Notification::createForRole(
                'Gudang',
                "Transfer received: {$transfer->transfer_number} - {$validated['quantity_received']} units received",
                'success',
                '/warehouse/transfers'
            );

            DB::commit();

            return response()->json([
                'message' => 'Goods received successfully',
                'transfer' => $transfer->load(['product', 'warehouseFrom', 'warehouseTo', 'receivedBy'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to receive goods: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel warehouse transfer.
     */
    public function cancel(Request $request, $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        $transfer = WarehouseTransfer::findOrFail($id);
        $user = $request->user();

        if (!$transfer->canBeCancelled()) {
            return response()->json([
                'message' => 'This transfer cannot be cancelled'
            ], 422);
        }

        // Only requester or admin can cancel
        if ($transfer->requested_by != $user->id && $user->role !== 'Admin') {
            return response()->json([
                'message' => 'Only the requester or admin can cancel this transfer'
            ], 403);
        }

        try {
            DB::beginTransaction();

            $transfer->update([
                'status' => 'CANCELLED',
                'reason' => $validated['reason'],
            ]);

            // Log activity
            ActivityLog::log(
                'WAREHOUSE_TRANSFER_CANCELLED',
                "User {$user->name} cancelled warehouse transfer {$transfer->transfer_number}. Reason: {$validated['reason']}",
                $transfer
            );

            DB::commit();

            return response()->json([
                'message' => 'Warehouse transfer cancelled successfully',
                'transfer' => $transfer
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to cancel transfer: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get transfer statistics.
     */
    public function statistics(Request $request)
    {
        $user = $request->user();

        $query = WarehouseTransfer::query();

        // Filter by user warehouse if warehouse staff
        $query->forUser($user);

        $stats = [
            'total_transfers' => $query->count(),
            'requested' => $query->where('status', 'REQUESTED')->count(),
            'approved' => $query->where('status', 'APPROVED')->count(),
            'in_transit' => $query->where('status', 'IN_TRANSIT')->count(),
            'received' => $query->where('status', 'RECEIVED')->count(),
            'cancelled' => $query->where('status', 'CANCELLED')->count(),
        ];

        return response()->json($stats);
    }
}