<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== DEBUGGING PRODUCT PRICE ===\n";

$firstProduct = App\Models\Product::first();

echo "First Product:\n";
echo "  ID: {$firstProduct->id}\n";
echo "  Name: {$firstProduct->name}\n";
echo "  Selling Price: " . var_export($firstProduct->selling_price, true) . "\n";
echo "  Selling Price Type: " . gettype($firstProduct->selling_price) . "\n";

// Check if the column exists
echo "\nChecking if selling_price column exists...\n";
$schema = \Illuminate\Support\Facades\Schema::hasColumn('products', 'selling_price');
echo "  selling_price column exists: " . ($schema ? 'YES' : 'NO') . "\n";

// Check columns in products table
echo "\nColumns in products table:\n";
$columns = \Illuminate\Support\Facades\Schema::getColumnListing('products');
foreach ($columns as $column) {
    echo "  - $column\n";
}

// Fresh check
echo "\nFresh product check:\n";
$product = App\Models\Product::find(1);
echo "  Product 1 selling_price: " . var_export($product->selling_price, true) . "\n";

// Update with explicit value
echo "\nUpdating product 1 with explicit price...\n";
$product->update(['selling_price' => 100000]);
$product->refresh();
echo "  After update - selling_price: " . var_export($product->selling_price, true) . "\n";

echo "\n=== DEBUG COMPLETE ===\n";