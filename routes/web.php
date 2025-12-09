<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use App\Http\Controllers\PdfPreviewController;

// Add login route for Laravel authentication redirect
Route::get('/login', function () {
    return view('welcome');
})->name('login');



Route::get('/', function () {
    return view('welcome');
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
