<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GoodsReceipt;
use App\Services\GoodsReceiptService;
use App\Http\Requests\StoreGoodsReceiptRequest;
use App\Http\Requests\UpdateGoodsReceiptRequest;
use App\Http\Requests\ProcessGoodsReceiptRequest;
use App\Http\Resources\GoodsReceiptResource;

class GoodsReceiptController extends Controller
{
    protected $goodsReceiptService;

    public function __construct(GoodsReceiptService $goodsReceiptService)
    {
        $this->goodsReceiptService = $goodsReceiptService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = GoodsReceipt::with(['purchaseOrder.supplier', 'warehouse', 'receivedBy', 'items.product']);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'like', "%{$search}%")
                    ->orWhereHas('purchaseOrder', function ($pq) use ($search) {
                        $pq->where('po_number', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by user warehouse access
        $user = $request->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->where('warehouse_id', $user->warehouse_id);
        }

        // Date range filtering
        if ($request->has('date_from')) {
            $query->whereDate('received_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('received_date', '<=', $request->date_to);
        }

        $goodsReceipts = $query->orderBy('created_at', 'desc')->paginate(20);
        return GoodsReceiptResource::collection($goodsReceipts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreGoodsReceiptRequest $request)
    {
        $goodsReceipt = $this->goodsReceiptService->createGoodsReceipt($request->validated(), $request->user()->id);
        return new GoodsReceiptResource($goodsReceipt);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $goodsReceipt = GoodsReceipt::with([
            'purchaseOrder.supplier',
            'warehouse',
            'receivedBy',
            'items.product',
            'items.purchaseOrderItem'
        ])->findOrFail($id);

        // Check warehouse access for non-super admins
        $user = request()->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id != $goodsReceipt->warehouse_id) {
            return response()->json(['message' => 'Unauthorized access to this goods receipt'], 403);
        }

        return new GoodsReceiptResource($goodsReceipt);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateGoodsReceiptRequest $request, $id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);

        try {
            $updatedGoodsReceipt = $this->goodsReceiptService->updateGoodsReceipt($goodsReceipt, $request->validated());
            return new GoodsReceiptResource($updatedGoodsReceipt);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);

        try {
            $this->goodsReceiptService->deleteGoodsReceipt($goodsReceipt);
            return response()->json(['message' => 'Goods Receipt deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Process goods receipt (receive items and update stock)
     */
    public function receive(ProcessGoodsReceiptRequest $request, $id)
    {
        $goodsReceipt = GoodsReceipt::findOrFail($id);

        try {
            $processedGoodsReceipt = $this->goodsReceiptService->processGoodsReceipt(
                $goodsReceipt,
                $request->notes,
                $request->user()->id
            );
            return new GoodsReceiptResource($processedGoodsReceipt);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Get goods receipts by status
     */
    public function getByStatus($status)
    {
        $query = GoodsReceipt::with(['purchaseOrder.supplier', 'warehouse', 'items.product'])
            ->where('status', $status);

        // Filter by user warehouse access
        $user = request()->user();
        if ($user && !$user->canAccessAllWarehouses() && $user->warehouse_id) {
            $query->where('warehouse_id', $user->warehouse_id);
        }

        $goodsReceipts = $query->orderBy('created_at', 'desc')->get();
        return GoodsReceiptResource::collection($goodsReceipts);
    }

    /**
     * Get goods receipt items
     */
    public function getGoodsReceiptItems($id)
    {
        $goodsReceipt = GoodsReceipt::with(['items.product', 'items.purchaseOrderItem'])->findOrFail($id);
        return response()->json($goodsReceipt->items);
    }
}
