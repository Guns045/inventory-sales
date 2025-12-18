<?php

namespace App\Imports;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductStockImport implements ToCollection, WithHeadingRow
{
    protected $warehouseId;
    protected $userId;

    public function __construct($warehouseId, $userId)
    {
        $this->warehouseId = $warehouseId;
        $this->userId = $userId;
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            try {
                // Normalize keys to handle variations
                $sku = $row['part_number'] ?? $row['partnumber'] ?? $row['part_no'] ?? null;

                // Skip if no part number
                if (empty($sku)) {
                    continue;
                }

                $sku = trim($sku);
                $product = Product::where('sku', $sku)->first();

                // Get description from row
                $description = $row['description'] ?? $row['desc'] ?? $row['product_name'] ?? null;

                if (!$product) {
                    // Create new product if not found
                    $product = Product::create([
                        'sku' => $sku,
                        'name' => $description ?? $sku, // Use description as name if available, else SKU
                        'description' => $description,
                        'weight' => isset($row['weight']) && is_numeric($row['weight']) ? $row['weight'] : 0,
                        'buy_price' => 0, // Default
                        'sell_price' => 0, // Default
                    ]);
                    Log::info("Created new product during import: {$sku}");
                } else {
                    // Update existing product details
                    $updates = [];
                    if ($description) {
                        $updates['description'] = $description;
                        // Optionally update name if it was just the SKU before? 
                        // Let's keep name as is to avoid overwriting good names with generic descriptions, 
                        // unless name is same as SKU.
                        if ($product->name === $product->sku) {
                            $updates['name'] = $description;
                        }
                    }
                    if (isset($row['weight']) && is_numeric($row['weight'])) {
                        $updates['weight'] = $row['weight'];
                    }

                    if (!empty($updates)) {
                        $product->update($updates);
                    }
                }

                DB::transaction(function () use ($product, $row) {
                    // Find or create stock record
                    $stock = ProductStock::firstOrNew([
                        'product_id' => $product->id,
                        'warehouse_id' => $this->warehouseId
                    ]);

                    $oldQuantity = $stock->quantity ?? 0;
                    $newQuantity = isset($row['quantity']) ? (float) $row['quantity'] : $oldQuantity;

                    // Update bin location if provided
                    if (isset($row['bin_location'])) {
                        $stock->bin_location = $row['bin_location'];
                    }

                    $stock->quantity = $newQuantity;
                    $stock->save();

                    // Record movement if quantity changed
                    if ($oldQuantity != $newQuantity) {
                        StockMovement::create([
                            'product_id' => $product->id,
                            'warehouse_id' => $this->warehouseId,
                            'user_id' => $this->userId,
                            'type' => 'ADJUSTMENT', // Or IMPORT
                            'quantity_change' => $newQuantity - $oldQuantity,
                            'reference_type' => 'IMPORT',
                            'reference_id' => null, // Could store a batch ID here if needed
                            'notes' => 'Bulk stock import'
                        ]);
                    }
                });

            } catch (\Exception $e) {
                $skuForLog = $row['part_number'] ?? $row['partnumber'] ?? 'Unknown';
                Log::error("Error importing row for SKU {$skuForLog}: " . $e->getMessage());
            }
        }
    }
}
