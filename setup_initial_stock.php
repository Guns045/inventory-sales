<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Setup Initial Product Stock Data ===\n";

// Get all products
$products = \App\Models\Product::all();
$warehouses = \App\Models\Warehouse::all();

echo "📊 Found " . $products->count() . " products\n";
echo "📦 Found " . $warehouses->count() . " warehouses\n\n";

// Get Super Admin user for logging
$user = \App\Models\User::find(1);

echo "🔧 Setting up initial stock data...\n\n";

foreach ($products as $product) {
    echo "📦 Processing product: {$product->name} (SKU: {$product->sku})\n";

    foreach ($warehouses as $warehouse) {
        // Check if stock already exists
        $existingStock = \App\Models\ProductStock::where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->first();

        if (!$existingStock) {
            // Determine initial stock quantity
            $initialQuantity = 0;
            $initialReserved = 0;

            // Assign different initial quantities based on product pattern or type
            if (strpos($product->name, 'Filter') !== false) {
                $initialQuantity = 20; // Filter products
            } elseif (strpos($product->name, 'Part') !== false || strpos($product->sku, 'PART') !== false) {
                $initialQuantity = 15; // Spare parts
            } elseif (strpos($product->name, 'Engine') !== false) {
                $initialQuantity = 5;  // Engines
            } else {
                $initialQuantity = 10; // Default
            }

            // Create product stock record
            $stock = \App\Models\ProductStock::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'quantity' => $initialQuantity,
                'reserved_quantity' => $initialReserved,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            echo "   ✓ {$warehouse->name}: {$initialQuantity} units\n";

            // Create stock movement record
            \App\Models\StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'type' => 'IN',
                'quantity_change' => $initialQuantity,
                'reference_type' => 'INITIAL_STOCK',
                'reference_id' => null,
                'notes' => "Initial stock setup for {$product->name} in {$warehouse->name}",
                'created_at' => now(),
                'updated_at' => now()
            ]);

        } else {
            echo "   ○ {$warehouse->name}: Already exists ({$existingStock->quantity} units)\n";
        }
    }
    echo "\n";
}

// Create summary report
$totalStockRecords = \App\Models\ProductStock::count();
$totalQuantity = \App\Models\ProductStock::sum('quantity');
$totalReserved = \App\Models\ProductStock::sum('reserved_quantity');
$totalAvailable = $totalQuantity - $totalReserved;

echo "📈 Stock Summary Report:\n";
echo "   Total Stock Records: {$totalStockRecords}\n";
echo "   Total Quantity: {$totalQuantity} units\n";
echo "   Total Reserved: {$totalReserved} units\n";
echo "   Total Available: {$totalAvailable} units\n\n";

// Check products below minimum stock level
$lowStockProducts = [];
foreach ($products as $product) {
    $totalAvailable = \App\Models\ProductStock::where('product_id', $product->id)
        ->selectRaw('SUM(quantity - reserved_quantity) as available')
        ->value('available') ?? 0;

    if ($totalAvailable < $product->min_stock_level) {
        $lowStockProducts[] = [
            'sku' => $product->sku,
            'name' => $product->name,
            'available' => $totalAvailable,
            'min_level' => $product->min_stock_level,
            'shortage' => $product->min_stock_level - $totalAvailable
        ];
    }
}

if (!empty($lowStockProducts)) {
    echo "⚠️  Low Stock Alerts:\n";
    foreach ($lowStockProducts as $product) {
        echo "   • {$product['name']} ({$product['sku']}) - {$product['available']} / {$product['min_level']} (Shortage: {$product['shortage']})\n";
    }
} else {
    echo "✅ All products are above minimum stock level\n";
}

echo "\n🎯 Initial Stock Setup Complete!\n";
echo "📊 Next Steps:\n";
echo "   1. Review stock levels in Product Stock management\n";
echo "   " . "2. Update quantities based on actual inventory count\n";
echo "   " . "3. Set reorder points for each product\n";
echo "   " . "4. Monitor low stock alerts\n";

// Log the activity
if ($user) {
    \App\Models\ActivityLog::create([
        'user_id' => $user->id,
        'action' => 'Stock Setup',
        'description' => "Set up initial product stock data. Total records: {$totalStockRecords}, Total quantity: {$totalQuantity} units",
        'reference_id' => null,
        'reference_type' => null,
        'old_values' => null,
        'new_values' => json_encode([
            'total_records' => $totalStockRecords,
            'total_quantity' => $totalQuantity,
            'total_available' => $totalAvailable
        ]),
        'ip_address' => request()->ip(),
        'user_agent' => request()->userAgent(),
        'created_at' => now(),
        'updated_at' => now()
    ]);
}