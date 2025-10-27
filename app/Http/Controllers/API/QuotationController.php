<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $quotations = Quotation::with(['customer', 'user', 'quotationItems.product'])->paginate(10);
        return response()->json($quotations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'valid_until' => 'required|date',
            'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,REJECTED',
        ]);

        $quotation = DB::transaction(function () use ($request) {
            $quotation = Quotation::create([
                'quotation_number' => 'Q-' . date('Y-m') . '-' . str_pad(Quotation::count() + 1, 4, '0', STR_PAD_LEFT),
                'customer_id' => $request->customer_id,
                'user_id' => auth()->id(),
                'status' => $request->status,
                'valid_until' => $request->valid_until,
            ]);

            // Create quotation items
            foreach ($request->items as $item) {
                $request->validate([
                    'items.*.product_id' => 'required|exists:products,id',
                    'items.*.quantity' => 'required|integer|min:1',
                    'items.*.unit_price' => 'required|numeric|min:0',
                    'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
                    'items.*.tax_rate' => 'required|numeric|min:0',
                ]);

                $totalPrice = $item['quantity'] * $item['unit_price'];
                $discountAmount = $totalPrice * ($item['discount_percentage'] / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item['tax_rate'] / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'],
                    'tax_rate' => $item['tax_rate'],
                    'total_price' => $totalPrice,
                ]);
            }

            // Calculate totals
            $subtotal = $quotation->quotationItems->sum('total_price');
            $totalAmount = $subtotal; // In this implementation, subtotal and total are the same after tax
            
            $quotation->update([
                'subtotal' => $subtotal,
                'total_amount' => $totalAmount,
            ]);

            return $quotation->refresh();
        });

        return response()->json($quotation->load(['customer', 'user', 'quotationItems.product']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $quotation = Quotation::with(['customer', 'user', 'quotationItems.product'])->findOrFail($id);
        return response()->json($quotation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'valid_until' => 'required|date',
            'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,REJECTED',
        ]);

        $quotation = DB::transaction(function () use ($request, $quotation) {
            $quotation->update([
                'customer_id' => $request->customer_id,
                'status' => $request->status,
                'valid_until' => $request->valid_until,
            ]);

            // Update quotation items
            QuotationItem::where('quotation_id', $quotation->id)->delete();

            foreach ($request->items as $item) {
                $request->validate([
                    'items.*.product_id' => 'required|exists:products,id',
                    'items.*.quantity' => 'required|integer|min:1',
                    'items.*.unit_price' => 'required|numeric|min:0',
                    'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
                    'items.*.tax_rate' => 'required|numeric|min:0',
                ]);

                $totalPrice = $item['quantity'] * $item['unit_price'];
                $discountAmount = $totalPrice * ($item['discount_percentage'] / 100);
                $taxAmount = ($totalPrice - $discountAmount) * ($item['tax_rate'] / 100);
                $totalPrice = $totalPrice - $discountAmount + $taxAmount;

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'],
                    'tax_rate' => $item['tax_rate'],
                    'total_price' => $totalPrice,
                ]);
            }

            // Calculate totals
            $subtotal = $quotation->quotationItems->sum('total_price');
            $totalAmount = $subtotal;
            
            $quotation->update([
                'subtotal' => $subtotal,
                'total_amount' => $totalAmount,
            ]);

            return $quotation->refresh();
        });

        return response()->json($quotation->load(['customer', 'user', 'quotationItems.product']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $quotation = Quotation::findOrFail($id);
        $quotation->delete();

        return response()->json(['message' => 'Quotation deleted successfully']);
    }

    public function getQuotationItems($id)
    {
        $quotation = Quotation::with('quotationItems.product')->findOrFail($id);
        return response()->json($quotation->quotationItems);
    }

    public function approve($id)
    {
        $quotation = Quotation::findOrFail($id);
        $quotation->update(['status' => 'APPROVED']);
        
        return response()->json($quotation);
    }

    public function reject($id)
    {
        $quotation = Quotation::findOrFail($id);
        $quotation->update(['status' => 'REJECTED']);
        
        return response()->json($quotation);
    }
}
