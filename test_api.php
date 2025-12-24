<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Login as user 1
$user = \App\Models\User::find(1);
\Illuminate\Support\Facades\Auth::login($user);

$request = Illuminate\Http\Request::create('/api/delivery-orders', 'GET', ['source_type' => 'SO', 'page' => 1]);
$request->headers->set('Accept', 'application/json');

$response = $kernel->handle($request);

echo "Status: " . $response->getStatusCode() . PHP_EOL;
echo "Content: " . $response->getContent() . PHP_EOL;
