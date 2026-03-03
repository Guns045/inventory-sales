<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Product;
use App\Models\PurchaseOrderItem;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all products that have purchase order items
        $productIds = PurchaseOrderItem::distinct()->pluck('product_id');

        foreach ($productIds as $productId) {
            // Find the most recent purchase order item for this product
            $latestItem = PurchaseOrderItem::where('product_id', $productId)
                ->latest()
                ->first();

            if ($latestItem) {
                $product = Product::find($productId);
                if ($product) {
                    $product->update(['buy_price' => $latestItem->unit_price]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is data-only and doesn't change schema, 
        // rolling back prices might be destructive/unpredictable.
    }
};
