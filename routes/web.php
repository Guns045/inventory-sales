<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PdfPreviewController;

Route::get('/', function () {
    return view('welcome');
});

// Add login route for Sanctum authentication
Route::get('/login', function () {
    return response()->json(['message' => 'API Login endpoint is at /api/login'], 401);
})->name('login');

Route::get('/preview/delivery', [PdfPreviewController::class, 'mockDelivery'])->name('preview.delivery');
Route::get('/preview/delivery-db/{id?}', [PdfPreviewController::class, 'testDeliveryFromDatabase'])->name('preview.delivery.db');
Route::get('/preview/picking-list', [PdfPreviewController::class, 'mockPickingList'])->name('preview.picking-list');
Route::get('/preview/picking-list-db/{id?}', [PdfPreviewController::class, 'testPickingListFromDatabase'])->name('preview.picking-list.db');
Route::get('/preview/quotation', [PdfPreviewController::class, 'mockQuotation'])->name('preview.quotation');
Route::get('/preview/quotation-db/{id?}', [PdfPreviewController::class, 'testQuotationFromDatabase'])->name('preview.quotation.db');
Route::get('/preview/invoice', [PdfPreviewController::class, 'mockInvoice'])->name('preview.invoice');
Route::get('/preview/invoice-db/{id?}', [PdfPreviewController::class, 'testInvoiceFromDatabase'])->name('preview.invoice.db');

// Catch-all route for React SPA (must be last)
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');





