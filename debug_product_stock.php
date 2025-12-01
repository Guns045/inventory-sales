<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\API\ProductStockController;
use App\Services\ProductStockService;

// Mock request
$request = Request::create('/api/product-stock', 'GET', [
    'view_mode' => 'all-warehouses',
    'per_page' => 5
]);

// Mock user (Sales Team)
$user = User::whereHas('roles', function ($q) {
    $q->where('name', 'Sales Team');
})->first();

if (!$user) {
    $user = User::first(); // Fallback
    echo "Using fallback user: " . $user->name . "\n";
} else {
    echo "Using Sales Team user: " . $user->name . "\n";
}

$request->setUserResolver(function () use ($user) {
    return $user;
});

// Instantiate controller
$service = new ProductStockService();
$controller = new ProductStockController($service);

// Call index
$response = $controller->index($request);

// Output result
$data = $response->getData(true);

echo "Meta Total: " . ($data['meta']['total'] ?? 'N/A') . "\n";

if (!empty($data['data'])) {
    $firstItem = $data['data'][0];
    echo "First Item ID: " . $firstItem['id'] . "\n";
    echo "First Item Product ID: " . $firstItem['product_id'] . "\n";

    if (isset($firstItem['stocks'])) {
        echo "Stocks count: " . count($firstItem['stocks']) . "\n";
        foreach ($firstItem['stocks'] as $stock) {
            echo "  - Warehouse ID: " . $stock['warehouse_id'] . " (Type: " . gettype($stock['warehouse_id']) . ")\n";
            echo "    Quantity: " . $stock['quantity'] . "\n";
        }
    } else {
        echo "Stocks property MISSING!\n";
    }
} else {
    echo "No data found.\n";
}
