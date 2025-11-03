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
use App\Http\Controllers\API\CompanySettingsController;
use App\Http\Controllers\API\PickingListController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Public company settings (for displaying logo/info)
Route::get('/company-settings/public', [CompanySettingsController::class, 'index']);

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
    Route::get('/product-stock', [ProductStockController::class, 'index'])->middleware('permission:product-stock.read');
    Route::get('/product-stock/{id}', [ProductStockController::class, 'show'])->middleware('permission:product-stock.read');
    Route::post('/product-stock', [ProductStockController::class, 'store'])->middleware('permission:product-stock.create');
    Route::put('/product-stock/{id}', [ProductStockController::class, 'update'])->middleware('permission:product-stock.update');
    Route::delete('/product-stock/{id}', [ProductStockController::class, 'destroy'])->middleware('permission:product-stock.delete');
    
    // Sales management
    Route::apiResource('quotations', QuotationController::class);
    Route::get('/quotations/{id}/items', [QuotationController::class, 'getQuotationItems']);
    Route::post('/quotations/{id}/submit', [QuotationController::class, 'submit']);
    Route::post('/quotations/{id}/approve', [QuotationController::class, 'approve'])->middleware('permission:quotations.approve');
    Route::post('/quotations/{id}/reject', [QuotationController::class, 'reject'])->middleware('permission:quotations.reject');
    Route::post('/quotations/{id}/create-sales-order', [QuotationController::class, 'createSalesOrder']);
    Route::get('/quotations/{id}/check-convertibility', [QuotationController::class, 'checkConvertibility']);
    
    Route::get('/sales-orders', [SalesOrderController::class, 'index'])->middleware('permission:sales-orders.read');
Route::post('/sales-orders', [SalesOrderController::class, 'store']);
Route::get('/sales-orders/{sales_order}', [SalesOrderController::class, 'show']);
Route::put('/sales-orders/{sales_order}', [SalesOrderController::class, 'update']);
Route::delete('/sales-orders/{sales_order}', [SalesOrderController::class, 'destroy']);
    Route::get('/sales-orders/{id}/items', [SalesOrderController::class, 'getSalesOrderItems']);
    Route::post('/sales-orders/{id}/update-status', [SalesOrderController::class, 'updateStatus']);
    Route::post('/sales-orders/{id}/create-picking-list', [SalesOrderController::class, 'createPickingList']);

    // Picking List management
    Route::get('/picking-lists', [PickingListController::class, 'index'])->middleware('permission:picking-lists.read');
    Route::post('/picking-lists', [PickingListController::class, 'store'])->middleware('permission:picking-lists.create');
    Route::get('/picking-lists/{picking_list}', [PickingListController::class, 'show'])->middleware('permission:picking-lists.read');
    Route::put('/picking-lists/{picking_list}', [PickingListController::class, 'update'])->middleware('permission:picking-lists.update');
    Route::delete('/picking-lists/{picking_list}', [PickingListController::class, 'destroy'])->middleware('permission:picking-lists.delete');
    Route::get('/picking-lists/{picking_list}/items', [PickingListController::class, 'getItems'])->middleware('permission:picking-lists.read');
    Route::get('/picking-lists/{picking_list}/print', [PickingListController::class, 'print'])->middleware('permission:picking-lists.print');
    Route::post('/picking-lists/{picking_list}/complete', [PickingListController::class, 'complete'])->middleware('permission:picking-lists.complete');

    // Delivery management
    Route::apiResource('delivery-orders', DeliveryOrderController::class);
    Route::get('/delivery-orders/{id}/items', [DeliveryOrderController::class, 'getDeliveryOrderItems']);
    Route::post('/delivery-orders/from-picking-list', [DeliveryOrderController::class, 'createFromPickingList']);
    Route::post('/delivery-orders/from-sales-order', [DeliveryOrderController::class, 'createFromSalesOrder']);
    Route::post('/delivery-orders/{id}/mark-as-shipped', [DeliveryOrderController::class, 'markAsShipped']);
    Route::post('/delivery-orders/{id}/mark-as-delivered', [DeliveryOrderController::class, 'markAsDelivered']);
    Route::get('/delivery-orders/{id}/print', [DeliveryOrderController::class, 'print']);
      Route::get('/delivery-orders/available-picking-lists', [DeliveryOrderController::class, 'getAvailablePickingLists']);
    Route::get('/picking-lists/available-for-delivery', [PickingListController::class, 'getAvailableForDelivery']);
    
    // Finance management
    Route::apiResource('invoices', InvoiceController::class);
    Route::get('/invoices/{id}/items', [InvoiceController::class, 'getInvoiceItems']);
    Route::get('/invoices/{id}/print', [InvoiceController::class, 'print'])->middleware('permission:invoices.read');
    Route::patch('/invoices/{id}/status', [InvoiceController::class, 'updateStatus'])->middleware('permission:invoices.update');
    Route::get('/invoices/export', [InvoiceController::class, 'export'])->middleware('permission:invoices.read');
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
    Route::get('/dashboard', [DashboardController::class, 'getDashboardData'])->middleware('permission:dashboard.read');
    Route::get('/dashboard/sales', [DashboardController::class, 'salesDashboard'])->middleware('permission:dashboard.sales');
    Route::get('/dashboard/approval', [DashboardController::class, 'approvalDashboard'])->middleware('permission:dashboard.approval');
    Route::get('/dashboard/warehouse', [DashboardController::class, 'warehouseDashboard'])->middleware('permission:dashboard.warehouse');
    Route::get('/dashboard/finance', [DashboardController::class, 'financeDashboard'])->middleware('permission:dashboard.finance');

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/admin', [NotificationController::class, 'adminNotifications']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::post('/notifications/create', [NotificationController::class, 'createNotification']);

    // Activity log routes
    Route::get('/activity-logs', [NotificationController::class, 'activityLogs'])->middleware('permission:activity-logs.read');
    Route::get('/activity-logs/my', [NotificationController::class, 'myActivityLogs'])->middleware('permission:activity-logs.read');

    // Reports routes
    Route::get('/reports/stock', [DashboardController::class, 'stockReports']);
    Route::get('/reports/sales', [DashboardController::class, 'salesReports']);

    // Company Settings routes (Admin only)
    Route::apiResource('company-settings', CompanySettingsController::class)->middleware('permission:users.update');
    Route::post('/company-settings/upload-logo', [CompanySettingsController::class, 'uploadLogo'])->middleware('permission:users.update');
    Route::delete('/company-settings/{id}/delete-logo', [CompanySettingsController::class, 'deleteLogo'])->middleware('permission:users.update');

    // Inventory Management routes
    Route::post('/inventory/deduct', [InventoryController::class, 'deductStock'])->middleware('permission:inventory.update');
    Route::post('/inventory/reserve', [InventoryController::class, 'reserveStock'])->middleware('permission:inventory.update');
    Route::get('/inventory/stock-levels', [InventoryController::class, 'getStockLevels'])->middleware('permission:inventory.read');
    Route::get('/inventory/product-movements/{product_id}', [InventoryController::class, 'getProductMovements'])->middleware('permission:inventory.read');
});