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
use App\Http\Controllers\API\ApprovalController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\NotificationController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // User and Role Management
    Route::get('/user/permissions', [RoleController::class, 'getUserPermissions']);
    Route::post('/check-permission/{permission}', [RoleController::class, 'checkPermission']);
    Route::apiResource('users', UserController::class);
    // Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create');
    // Route::put('users/{id}', [UserController::class, 'update'])->middleware('permission:users.update');
    // Route::delete('users/{id}', [UserController::class, 'destroy'])->middleware('permission:users.delete');
    Route::apiResource('roles', RoleController::class)->middleware('permission:users.read');
    
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
    Route::post('/quotations/{id}/submit', [QuotationController::class, 'submit']);
    Route::post('/quotations/{id}/approve', [QuotationController::class, 'approve'])->middleware('permission:quotations.approve');
    Route::post('/quotations/{id}/reject', [QuotationController::class, 'reject'])->middleware('permission:quotations.reject');
    Route::post('/quotations/{id}/create-sales-order', [QuotationController::class, 'createSalesOrder']);
    
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

    // Approval management
    Route::apiResource('approvals', ApprovalController::class)->only(['index', 'show']);
    Route::get('/approvals/type/{type}', [ApprovalController::class, 'getByType']);
    Route::post('/approvals/{id}/approve', [ApprovalController::class, 'approve']);
    Route::post('/approvals/{id}/reject', [ApprovalController::class, 'reject']);
    Route::post('/quotations/{id}/submit-for-approval', [ApprovalController::class, 'submitQuotation']);
    Route::get('/my-approval-requests', [ApprovalController::class, 'myRequests']);
    Route::get('/pending-approvals', [ApprovalController::class, 'pendingForMe']);

    // Export routes
    Route::get('/quotations/{id}/export-pdf', [QuotationController::class, 'exportPDF']);
    Route::get('/quotations/{id}/export-excel', [QuotationController::class, 'exportExcel']);

    // Dashboard routes
    Route::get('/dashboard', [DashboardController::class, 'getDashboardData']);
    Route::get('/dashboard/sales', [DashboardController::class, 'salesDashboard']);
    Route::get('/dashboard/approval', [DashboardController::class, 'approvalDashboard']);
    Route::get('/dashboard/warehouse', [DashboardController::class, 'warehouseDashboard']);
    Route::get('/dashboard/finance', [DashboardController::class, 'financeDashboard']);

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/admin', [NotificationController::class, 'adminNotifications']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::post('/notifications/create', [NotificationController::class, 'createNotification']);

    // Activity log routes
    Route::get('/activity-logs', [NotificationController::class, 'activityLogs']);
    Route::get('/activity-logs/my', [NotificationController::class, 'myActivityLogs']);

    // Reports routes
    Route::get('/reports/stock', [DashboardController::class, 'stockReports']);
    Route::get('/reports/sales', [DashboardController::class, 'salesReports']);
});