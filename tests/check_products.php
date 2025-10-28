<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== CHECKING PRODUCTS ===\n";

$products = App\Models\Product::take(3)->get();

foreach ($products as $product) {
    echo "Product ID: {$product->id}\n";
    echo "  Name: {$product->name}\n";
    echo "  Selling Price: " . ($product->selling_price ?? 'NULL') . "\n";
    echo "  Purchase Price: " . ($product->purchase_price ?? 'NULL') . "\n";
    echo "\n";
}

echo "Fixing products with NULL prices...\n";

// Update products to have proper prices
$products->each(function($product) {
    if (!$product->selling_price) {
        $product->update(['selling_price' => 100000]); // Default price
        echo "Updated product {$product->id} selling price to 100,000\n";
    }
});

echo "\n=== PRODUCTS CHECK COMPLETE ===\n";