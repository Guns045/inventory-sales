<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PdfPreviewController;

// Add login route for Laravel authentication redirect
Route::get('/login', function () {
    return view('welcome');
})->name('login');

// Simple API test endpoint
Route::get('/test-api', function () {
    return response()->json([
        'success' => true,
        'message' => 'API is working!',
        'server_time' => now()->toDateTimeString(),
        'ip' => request()->ip(),
        'user_agent' => request()->userAgent()
    ]);
});

// Database test endpoint
Route::get('/test-db', function () {
    try {
        $users = \DB::table('users')->count();
        $products = \DB::table('products')->count();
        return response()->json([
            'success' => true,
            'message' => 'Database connection working!',
            'data' => [
                'total_users' => $users,
                'total_products' => $products
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Database connection failed!',
            'error' => $e->getMessage()
        ], 500);
    }
});

Route::get('/', function () {
    return view('welcome');
});

Route::get('/preview/delivery', [PdfPreviewController::class, 'mockDelivery'])->name('preview.delivery');
Route::get('/preview/delivery-db/{id?}', [PdfPreviewController::class, 'testDeliveryFromDatabase'])->name('preview.delivery.db');
Route::get('/preview/picking-list', [PdfPreviewController::class, 'mockPickingList'])->name('preview.picking-list');
Route::get('/preview/picking-list-db/{id?}', [PdfPreviewController::class, 'testPickingListFromDatabase'])->name('preview.picking-list.db');
Route::get('/preview/quotation', [PdfPreviewController::class, 'mockQuotation'])->name('preview.quotation');
Route::get('/preview/quotation-db/{id?}', [PdfPreviewController::class, 'testQuotationFromDatabase'])->name('preview.quotation.db');
Route::get('/preview/invoice', [PdfPreviewController::class, 'mockInvoice'])->name('preview.invoice');
Route::get('/preview/invoice-db/{id?}', [PdfPreviewController::class, 'testInvoiceFromDatabase'])->name('preview.invoice.db');

// Testing routes for connection tests (must be before catch-all)
Route::get('/test-connection', function () {
    return response()->file(base_path('test-connection.html'));
});

Route::get('/simple-test', function () {
    return response()->file(base_path('simple-test.html'));
});

// Fix static asset serving for LAN access
Route::get('/node_modules/{path}', function ($path) {
    $fullPath = base_path('node_modules/' . $path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    $mimeType = 'application/octet-stream';
    if (str_ends_with($path, '.woff2'))
        $mimeType = 'font/woff2';
    elseif (str_ends_with($path, '.woff'))
        $mimeType = 'font/woff';
    elseif (str_ends_with($path, '.ttf'))
        $mimeType = 'font/ttf';
    elseif (str_ends_with($path, '.css'))
        $mimeType = 'text/css';
    elseif (str_ends_with($path, '.js'))
        $mimeType = 'application/javascript';

    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Access-Control-Allow-Origin' => '*',
        'Cache-Control' => 'public, max-age=31536000'
    ]);
})->where('path', '.*');

Route::get('/storage/{path}', function ($path) {
    // Try multiple possible storage paths
    $possiblePaths = [
        storage_path('app/public/' . $path),
        public_path('storage/' . $path),
        base_path('storage/app/public/' . $path)
    ];

    $fullPath = null;
    foreach ($possiblePaths as $possiblePath) {
        if (file_exists($possiblePath)) {
            $fullPath = $possiblePath;
            break;
        }
    }

    if (!$fullPath) {
        // Debug: log which paths were tried
        \Log::info('Storage file not found. Tried paths:', $possiblePaths);
        abort(404, 'File not found: ' . $path);
    }

    $mimeType = 'application/octet-stream';
    if (str_ends_with($path, '.png'))
        $mimeType = 'image/png';
    elseif (str_ends_with($path, '.jpg') || str_ends_with($path, '.jpeg'))
        $mimeType = 'image/jpeg';
    elseif (str_ends_with($path, '.gif'))
        $mimeType = 'image/gif';
    elseif (str_ends_with($path, '.svg'))
        $mimeType = 'image/svg+xml';

    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Access-Control-Allow-Origin' => '*',
        'Cache-Control' => 'public, max-age=31536000'
    ]);
})->where('path', '.*');

// Catch-all route for React SPA (must be last)
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
