<?php
$user = App\Models\User::first();
$request = Illuminate\Http\Request::create('/api/product-stock', 'GET', ['view_mode' => 'all-warehouses', 'per_page' => 1]);
$request->setUserResolver(function () use ($user) {
    return $user;
});
$service = new App\Services\ProductStockService();
$controller = new App\Http\Controllers\API\ProductStockController($service);
$response = $controller->index($request);
$data = $response->resolve();
print_r($data[0] ?? 'No data');
