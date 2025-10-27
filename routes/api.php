<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\RoleController;
use App\Http\Controllers\API\ProductController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\SupplierController;
use App\Http\Controllers\API\CustomerController;
use App\Http\Controllers\API\WarehouseController;
use App\Http\Controllers\API\ProductStockController;
use App\Http\Controllers\API\QuotationController;
use App\Http\Controllers\API\SalesOrderController;
use App\Http\Controllers\API\DeliveryOrderController;
use App\Http\Controllers\API\InvoiceController;
use App\Http\Controllers\API\PaymentController;
use App\Http\Controllers\API\PurchaseOrderController;
use App\Http\Controllers\API\GoodsReceiptController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // User and Role management
    Route::apiResource('users', UserController::class);
    Route::apiResource('roles', RoleController::class);
    
    // Master data
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('suppliers', SupplierController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('warehouses', WarehouseController::class);
    Route::apiResource('products', ProductController::class);
    
    // Inventory management
    Route::get('/product-stock', [ProductStockController::class, 'index']);
    Route::get('/product-stock/{id}', [ProductStockController::class, 'show']);
    Route::post('/product-stock', [ProductStockController::class, 'store']);
    Route::put('/product-stock/{id}', [ProductStockController::class, 'update']);
    Route::delete('/product-stock/{id}', [ProductStockController::class, 'destroy']);
    
    // Sales management
    Route::apiResource('quotations', QuotationController::class);
    Route::get('/quotations/{id}/items', [QuotationController::class, 'getQuotationItems']);
    Route::post('/quotations/{id}/approve', [QuotationController::class, 'approve']);
    Route::post('/quotations/{id}/reject', [QuotationController::class, 'reject']);
    
    Route::apiResource('sales-orders', SalesOrderController::class);
    Route::get('/sales-orders/{id}/items', [SalesOrderController::class, 'getSalesOrderItems']);
    Route::post('/sales-orders/{id}/update-status', [SalesOrderController::class, 'updateStatus']);
    
    // Delivery management
    Route::apiResource('delivery-orders', DeliveryOrderController::class);
    Route::get('/delivery-orders/{id}/items', [DeliveryOrderController::class, 'getDeliveryOrderItems']);
    
    // Finance management
    Route::apiResource('invoices', InvoiceController::class);
    Route::get('/invoices/{id}/items', [InvoiceController::class, 'getInvoiceItems']);
    Route::apiResource('payments', PaymentController::class);
    
    // Purchase management
    Route::apiResource('purchase-orders', PurchaseOrderController::class);
    Route::get('/purchase-orders/{id}/items', [PurchaseOrderController::class, 'getPurchaseOrderItems']);
    Route::post('/purchase-orders/{id}/receive', [PurchaseOrderController::class, 'receive']);
    
    Route::apiResource('goods-receipts', GoodsReceiptController::class);
    Route::get('/goods-receipts/{id}/items', [GoodsReceiptController::class, 'getGoodsReceiptItems']);
});