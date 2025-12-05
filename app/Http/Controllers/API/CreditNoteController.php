<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CreditNote;
use App\Models\SalesReturn;
use App\Services\CreditNoteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CreditNoteController extends Controller
{
    protected $creditNoteService;

    public function __construct(CreditNoteService $creditNoteService)
    {
        $this->creditNoteService = $creditNoteService;
    }

    public function index(Request $request)
    {
        $query = CreditNote::with(['salesReturn', 'customer', 'creator']);

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $creditNotes = $query->latest()->paginate(10);
        return response()->json($creditNotes);
    }

    public function store(Request $request)
    {
        $request->validate([
            'sales_return_id' => 'required|exists:sales_returns,id',
        ]);

        try {
            $salesReturn = SalesReturn::findOrFail($request->sales_return_id);
            $creditNote = $this->creditNoteService->createFromSalesReturn($salesReturn);

            return response()->json([
                'message' => 'Credit Note created successfully',
                'data' => $creditNote
            ], 201);
        } catch (\Exception $e) {
            Log::error('Credit Note Creation Error: ' . $e->getMessage());
            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $creditNote = CreditNote::with([
            'salesReturn.items.product',
            'salesReturn.salesOrder.items', // Load original SO items to get prices
            'customer',
            'creator'
        ])->findOrFail($id);

        // Calculate and attach prices to each return item
        if ($creditNote->salesReturn && $creditNote->salesReturn->items) {
            $salesOrder = $creditNote->salesReturn->salesOrder;

            foreach ($creditNote->salesReturn->items as $item) {
                $originalItem = $salesOrder->items->where('product_id', $item->product_id)->first();

                if ($originalItem) {
                    $unitPrice = $originalItem->unit_price;
                    $discount = $unitPrice * ($originalItem->discount_percentage / 100);
                    $tax = ($unitPrice - $discount) * ($originalItem->tax_rate / 100);
                    $finalUnitPrice = $unitPrice - $discount + $tax;

                    $item->unit_price = $finalUnitPrice;
                    $item->total_price = $finalUnitPrice * $item->quantity;
                } else {
                    $item->unit_price = 0;
                    $item->total_price = 0;
                }
            }
        }

        return response()->json($creditNote);
    }
}
