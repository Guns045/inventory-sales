<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SalesReturn;
use App\Services\SalesReturnService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesReturnController extends Controller
{
    protected $salesReturnService;

    public function __construct(SalesReturnService $salesReturnService)
    {
        $this->salesReturnService = $salesReturnService;
    }

    public function index(Request $request)
    {
        $query = SalesReturn::with(['salesOrder.customer', 'createdBy']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('return_number', 'like', "%{$search}%")
                ->orWhereHas('salesOrder.customer', function ($q) use ($search) {
                    $q->where('company_name', 'like', "%{$search}%");
                });
        }

        return response()->json($query->latest()->paginate(10));
    }

    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'reason' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.condition' => 'required|in:GOOD,DAMAGED',
        ]);

        try {
            $salesReturn = $this->salesReturnService->createReturn($request->all());
            return response()->json([
                'message' => 'Sales return created successfully',
                'data' => $salesReturn
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $salesReturn = SalesReturn::with(['items.product', 'salesOrder.customer', 'createdBy', 'approvedBy', 'creditNote'])->findOrFail($id);
        return response()->json(['data' => $salesReturn]);
    }

    public function approve($id)
    {
        try {
            $salesReturn = SalesReturn::findOrFail($id);
            $approvedReturn = $this->salesReturnService->approveReturn($salesReturn);
            return response()->json([
                'message' => 'Sales return approved successfully',
                'data' => $approvedReturn
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string'
        ]);

        try {
            $salesReturn = SalesReturn::findOrFail($id);
            $rejectedReturn = $this->salesReturnService->rejectReturn($salesReturn, $request->reason);
            return response()->json([
                'message' => 'Sales return rejected successfully',
                'data' => $rejectedReturn
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
