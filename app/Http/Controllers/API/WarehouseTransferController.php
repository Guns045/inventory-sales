<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWarehouseTransferRequest;
use App\Http\Requests\ApproveTransferRequest;
use App\Http\Requests\DeliverTransferRequest;
use App\Http\Requests\ReceiveTransferRequest;
use App\Http\Requests\CancelTransferRequest;
use App\Http\Resources\WarehouseTransferResource;
use App\Models\WarehouseTransfer;
use App\Services\WarehouseTransferService;
use Illuminate\Http\Request;

class WarehouseTransferController extends Controller
{
    protected $transferService;

    public function __construct(WarehouseTransferService $transferService)
    {
        $this->transferService = $transferService;
    }

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
        return WarehouseTransferResource::collection($transfers);
    }

    /**
     * Store a newly created warehouse transfer in storage.
     */
    public function store(StoreWarehouseTransferRequest $request)
    {
        $user = $request->user();

        // Check warehouse access permissions
        if (!$user->canAccessWarehouse($request->warehouse_from_id)) {
            return response()->json([
                'message' => 'You can only create transfers from your assigned warehouse'
            ], 403);
        }

        if (!$user->hasPermission('transfers', 'create')) {
            return response()->json([
                'message' => 'You do not have permission to create transfers'
            ], 403);
        }

        try {
            $transfer = $this->transferService->requestTransfer($request->validated(), $user);
            return new WarehouseTransferResource($transfer);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Warehouse Transfer Creation Error: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to create warehouse transfer',
                'error' => $e->getMessage()
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

        $user = request()->user();
        if ($user->role === 'Gudang' && $user->warehouse_id) {
            if ($transfer->warehouse_from_id != $user->warehouse_id && $transfer->warehouse_to_id != $user->warehouse_id) {
                return response()->json([
                    'message' => 'You can only view transfers involving your warehouse'
                ], 403);
            }
        }

        return new WarehouseTransferResource($transfer);
    }

    /**
     * Approve warehouse transfer request.
     */
    public function approve(ApproveTransferRequest $request, $id)
    {
        $transfer = WarehouseTransfer::findOrFail($id);
        $user = $request->user();

        if (!$user->canApproveTransfers()) {
            return response()->json(['message' => 'Permission denied'], 403);
        }

        if (!$user->canManageWarehouse($transfer->warehouse_from_id)) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        try {
            $result = $this->transferService->approveTransfer($transfer, $user, $request->notes);
            return response()->json([
                'message' => 'Warehouse transfer approved successfully',
                'transfer' => new WarehouseTransferResource($result['transfer']),
                'picking_list' => $result['picking_list']
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Create delivery order and update transfer status.
     */
    public function deliver(DeliverTransferRequest $request, $id)
    {
        $transfer = WarehouseTransfer::findOrFail($id);
        $user = $request->user();

        if ($user->role === 'Gudang' && $user->warehouse_id != $transfer->warehouse_from_id) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        try {
            $result = $this->transferService->deliverTransfer($transfer, $user, $request->validated());
            return response()->json([
                'message' => 'Delivery order created successfully',
                'transfer' => new WarehouseTransferResource($result['transfer']),
                'delivery_order' => $result['delivery_order']
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Receive goods and update stock.
     */
    public function receive(ReceiveTransferRequest $request, $id)
    {
        $transfer = WarehouseTransfer::findOrFail($id);
        $user = $request->user();

        if ($user->role === 'Gudang' && $user->warehouse_id != $transfer->warehouse_to_id) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        try {
            $transfer = $this->transferService->receiveTransfer($transfer, $user, $request->validated());
            return response()->json([
                'message' => 'Goods received successfully',
                'transfer' => new WarehouseTransferResource($transfer)
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Cancel warehouse transfer.
     */
    public function cancel(CancelTransferRequest $request, $id)
    {
        $transfer = WarehouseTransfer::findOrFail($id);
        $user = $request->user();

        if ($transfer->requested_by != $user->id && $user->role !== 'Admin') {
            return response()->json(['message' => 'Permission denied'], 403);
        }

        try {
            $transfer = $this->transferService->cancelTransfer($transfer, $user, $request->reason);
            return response()->json([
                'message' => 'Warehouse transfer cancelled successfully',
                'transfer' => new WarehouseTransferResource($transfer)
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Get transfer statistics.
     */
    public function statistics(Request $request)
    {
        $stats = $this->transferService->getStatistics($request->user());
        return response()->json($stats);
    }
}