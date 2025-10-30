<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Add login route for Sanctum authentication
Route::get('/login', function () {
    return response()->json(['message' => 'API Login endpoint is at /api/login'], 401);
})->name('login');
