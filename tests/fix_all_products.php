<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== FIXING ALL PRODUCTS ===\n";

$products = App\Models\Product::all();
$basePrice = 100000;

foreach ($products as $index => $product) {
    $price = $basePrice + ($index * 50000); // Incremental pricing

    if (!$product->selling_price) {
        $product->update(['selling_price' => $price]);
        echo "Updated product {$product->id} ({$product->name}) selling price to " . number_format($price) . "\n";
    }
}

echo "\n=== ALL PRODUCTS FIXED ===\n";