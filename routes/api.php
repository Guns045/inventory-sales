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
use App\Http\Controllers\API\SettingsController;
use App\Http\Controllers\API\PermissionController;
use App\Http\Controllers\API\ReportController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Public company settings (for displaying logo/info)
Route::get('/company-settings/public', [CompanySettingsController::class, 'index']);



// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // System Management (Root Only)
    Route::post('/system/reset-data', [App\Http\Controllers\API\SystemController::class, 'resetData']);
    Route::post('/admin/force-status', [App\Http\Controllers\API\SuperAdminController::class, 'forceStatus']);
    Route::post('/admin/revert-stock', [App\Http\Controllers\API\SuperAdminController::class, 'revertStock']);

    // User and Role Management
    Route::get('/user/permissions', [RoleController::class, 'getUserPermissions']);
    Route::post('/check-permission/{permission}', [RoleController::class, 'checkPermission']);

    // Profile Routes
    Route::get('/profile', [App\Http\Controllers\API\ProfileController::class, 'show']);
    Route::put('/profile', [App\Http\Controllers\API\ProfileController::class, 'update']);
    Route::post('/profile/avatar', [App\Http\Controllers\API\ProfileController::class, 'uploadAvatar']);

    Route::apiResource('users', UserController::class);
    Route::apiResource('users', UserController::class);

    // User management specific routes
    Route::put('/users/{id}/status', [UserController::class, 'updateStatus'])->middleware('permission:edit_users');
    Route::post('/users/bulk-activate', [UserController::class, 'bulkActivate'])->middleware('permission:edit_users');
    Route::post('/users/bulk-deactivate', [UserController::class, 'bulkDeactivate'])->middleware('permission:edit_users');
    Route::post('/users/bulk-delete', [UserController::class, 'bulkDelete'])->middleware('permission:delete_users');
    Route::post('/users/bulk-assign-role', [UserController::class, 'bulkAssignRole'])->middleware('permission:manage_roles');

    Route::apiResource('roles', RoleController::class)->middleware('permission:users.read');

    // Permission Management
    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::get('/permissions/grouped', [PermissionController::class, 'grouped']);
    Route::post('/permissions', [PermissionController::class, 'store'])->middleware('permission:manage_roles');
    Route::get('/permissions/{id}', [PermissionController::class, 'show']);
    Route::put('/permissions/{id}', [PermissionController::class, 'update'])->middleware('permission:manage_roles');
    Route::delete('/permissions/{id}', [PermissionController::class, 'destroy'])->middleware('permission:manage_roles');
    Route::get('/roles/{roleId}/permissions', [PermissionController::class, 'getRolePermissions']);
    Route::put('/roles/{roleId}/permissions', [PermissionController::class, 'syncRolePermissions'])->middleware('permission:manage_roles');

    // Master data
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('suppliers', SupplierController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('warehouses', WarehouseController::class);
    Route::get('/products/statistics', [ProductController::class, 'getStatistics']);
    Route::post('products/bulk-delete', [ProductController::class, 'bulkDestroy']);
    Route::post('product-stock/bulk-delete', [ProductStockController::class, 'bulkDestroy']);
    Route::apiResource('products', ProductController::class);

    // Inventory management
    Route::get('/product-stock', [ProductStockController::class, 'index'])->middleware('permission:product-stock.read');
    Route::get('/product-stock/{id}', [ProductStockController::class, 'show'])->middleware('permission:product-stock.read');
    Route::post('/product-stock', [ProductStockController::class, 'store'])->middleware('permission:product-stock.create');
    Route::put('/product-stock/{id}', [ProductStockController::class, 'update'])->middleware('permission:product-stock.update');
    Route::delete('/product-stock/{id}', [ProductStockController::class, 'destroy'])->middleware('permission:product-stock.delete');
    Route::post('/product-stock/adjust', [ProductStockController::class, 'adjustStock'])->middleware('permission:product-stock.update');
    Route::get('/product-stock/{id}/movements', [ProductStockController::class, 'getMovementHistory'])->middleware('permission:product-stock.read');

    // Sales management
    Route::apiResource('quotations', QuotationController::class);
    Route::get('/quotations/{id}/items', [QuotationController::class, 'getQuotationItems']);
    Route::post('/quotations/{id}/submit', [QuotationController::class, 'submit']);
    Route::post('/quotations/{id}/approve', [QuotationController::class, 'approve'])->middleware('permission:quotations.approve');
    Route::post('/quotations/{id}/reject', [QuotationController::class, 'reject'])->middleware('permission:quotations.reject');
    Route::get('/quotations/rejection-reasons', [QuotationController::class, 'getRejectionReasons']);
    Route::post('/quotations/{id}/create-sales-order', [QuotationController::class, 'createSalesOrder']);
    Route::get('/quotations/{id}/check-convertibility', [QuotationController::class, 'checkConvertibility']);

    Route::get('/sales-orders', [SalesOrderController::class, 'index'])->middleware('permission:sales-orders.read');
    Route::post('/sales-orders', [SalesOrderController::class, 'store']);
    Route::get('/sales-orders/{sales_order}', [SalesOrderController::class, 'show']);
    Route::put('/sales-orders/{sales_order}', [SalesOrderController::class, 'update']);
    Route::delete('/sales-orders/{sales_order}', [SalesOrderController::class, 'destroy']);
    Route::get('/sales-orders/{id}/items', [SalesOrderController::class, 'getSalesOrderItems']);
    Route::post('/sales-orders/{id}/update-status', [SalesOrderController::class, 'updateStatus']);
    Route::post('/sales-orders/{id}/cancel', [SalesOrderController::class, 'cancel']);
    Route::post('/sales-orders/{id}/create-picking-list', [SalesOrderController::class, 'createPickingList']);

    // Sales Returns
    Route::get('/sales-returns', [App\Http\Controllers\API\SalesReturnController::class, 'index']);
    Route::post('/sales-returns', [App\Http\Controllers\API\SalesReturnController::class, 'store']);
    Route::get('/sales-returns/{id}', [App\Http\Controllers\API\SalesReturnController::class, 'show']);
    Route::post('/sales-returns/{id}/approve', [App\Http\Controllers\API\SalesReturnController::class, 'approve']);
    Route::post('/sales-returns/{id}/reject', [App\Http\Controllers\API\SalesReturnController::class, 'reject']);

    // Credit Notes
    Route::get('/credit-notes', [App\Http\Controllers\API\CreditNoteController::class, 'index']);
    Route::post('/credit-notes', [App\Http\Controllers\API\CreditNoteController::class, 'store']);
    Route::get('/credit-notes/{id}', [App\Http\Controllers\API\CreditNoteController::class, 'show']);

    // Picking List management
    Route::get('/picking-lists', [PickingListController::class, 'index'])->middleware('permission:picking-lists.read');
    Route::post('/picking-lists', [PickingListController::class, 'store'])->middleware('permission:picking-lists.create');
    Route::get('/picking-lists/{picking_list}', [PickingListController::class, 'show'])->middleware('permission:picking-lists.read');
    Route::put('/picking-lists/{picking_list}', [PickingListController::class, 'update'])->middleware('permission:picking-lists.update');
    Route::delete('/picking-lists/{picking_list}', [PickingListController::class, 'destroy'])->middleware('permission:picking-lists.delete');
    Route::get('/picking-lists/{picking_list}/items', [PickingListController::class, 'getItems'])->middleware('permission:picking-lists.read');
    Route::get('/picking-lists/{picking_list}/print', [PickingListController::class, 'print'])->middleware('permission:picking-lists.print');
    Route::post('/picking-lists/{picking_list}/complete', [PickingListController::class, 'complete'])->middleware('permission:picking-lists.complete');

    // Picking List creation from orders
    Route::post('/picking-lists/from-sales-order', [PickingListController::class, 'createFromSalesOrder'])->middleware('permission:picking-lists.create');
    Route::post('/picking-lists/from-transfer', [PickingListController::class, 'createFromTransfer'])->middleware('permission:picking-lists.create');
    Route::get('/picking-lists/available-for-delivery', [PickingListController::class, 'getAvailableForDelivery'])->middleware('permission:picking-lists.read');

    // Delivery management - explicit routes to ensure all records are returned
    Route::get('/delivery-orders', [DeliveryOrderController::class, 'index']);
    Route::post('/delivery-orders', [DeliveryOrderController::class, 'store']);
    Route::get('/delivery-orders/{id}', [DeliveryOrderController::class, 'show']);
    Route::put('/delivery-orders/{id}', [DeliveryOrderController::class, 'update']);
    Route::delete('/delivery-orders/{id}', [DeliveryOrderController::class, 'destroy']);
    Route::get('/delivery-orders/{id}/items', [DeliveryOrderController::class, 'getDeliveryOrderItems']);
    Route::post('/delivery-orders/from-picking-list', [DeliveryOrderController::class, 'createFromPickingList']);
    Route::post('/delivery-orders/from-sales-order', [DeliveryOrderController::class, 'createFromSalesOrder']);
    Route::post('/delivery-orders/{id}/mark-as-shipped', [DeliveryOrderController::class, 'markAsShipped']);
    Route::post('/delivery-orders/{id}/mark-as-delivered', [DeliveryOrderController::class, 'markAsDelivered']);
    Route::put('/delivery-orders/{id}/status', [DeliveryOrderController::class, 'updateStatus']);
    Route::get('/delivery-orders/{id}/print', [DeliveryOrderController::class, 'print']);
    Route::post('/delivery-orders/from-transfer', [DeliveryOrderController::class, 'createFromTransfer']);
    Route::get('/delivery-orders/ready-to-create', [DeliveryOrderController::class, 'readyToCreate']);
    Route::get('/delivery-orders/available-picking-lists', [DeliveryOrderController::class, 'getAvailablePickingLists']);
    Route::get('/picking-lists/available-for-delivery', [PickingListController::class, 'getAvailableForDelivery']);

    // Finance management
    Route::get('/invoices/ready-to-create', [InvoiceController::class, 'getReadyToCreate']);
    Route::get('/invoices/export', [InvoiceController::class, 'export'])->middleware('permission:invoices.read');
    Route::apiResource('invoices', InvoiceController::class);
    Route::get('/invoices/{id}/items', [InvoiceController::class, 'getInvoiceItems']);
    Route::get('/invoices/{id}/print', [InvoiceController::class, 'print'])->middleware('permission:invoices.read');
    Route::patch('/invoices/{id}/status', [InvoiceController::class, 'updateStatus'])->middleware('permission:invoices.update');
    Route::apiResource('payments', PaymentController::class);

    // Purchase management
    Route::get('/purchase-orders/ready-for-goods-receipt', [PurchaseOrderController::class, 'readyForGoodsReceipt']);
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->middleware('permission:purchase-orders.read');
    Route::get('/purchase-orders/{id}/items', [PurchaseOrderController::class, 'getPurchaseOrderItems'])->middleware('permission:purchase-orders.read');
    Route::post('/purchase-orders/{id}/send', [PurchaseOrderController::class, 'sendPO'])->middleware('permission:purchase-orders.update');
    Route::get('/purchase-orders/{id}/print', [PurchaseOrderController::class, 'printPDF'])->middleware('permission:purchase-orders.read');
    Route::post('/purchase-orders/{id}/receive', [PurchaseOrderController::class, 'receive'])->middleware('permission:purchase-orders.update');
    Route::put('/purchase-orders/{id}/status', [PurchaseOrderController::class, 'updateStatus'])->middleware('permission:purchase-orders.update');
    Route::post('/purchase-orders/{id}/cancel', [PurchaseOrderController::class, 'cancel'])->middleware('permission:purchase-orders.update');

    Route::apiResource('goods-receipts', GoodsReceiptController::class)->middleware('permission:goods-receipts.read');
    Route::get('/goods-receipts/{id}/items', [GoodsReceiptController::class, 'getGoodsReceiptItems'])->middleware('permission:goods-receipts.read');
    Route::post('/goods-receipts/{id}/receive', [GoodsReceiptController::class, 'receive'])->middleware('permission:goods-receipts.update');
    Route::get('/goods-receipts/status/{status}', [GoodsReceiptController::class, 'getByStatus'])->middleware('permission:goods-receipts.read');

    // Approval management
    Route::apiResource('approvals', ApprovalController::class)->only(['index', 'show']);
    Route::get('/approvals/type/{type}', [ApprovalController::class, 'getByType']);
    Route::post('/approvals/{id}/approve', [ApprovalController::class, 'approve']);
    Route::post('/approvals/{id}/reject', [ApprovalController::class, 'reject']);
    Route::post('/quotations/{id}/submit-for-approval', [ApprovalController::class, 'submitQuotation']);
    Route::get('/my-approval-requests', [ApprovalController::class, 'myRequests']);
    Route::get('/pending-approvals', [ApprovalController::class, 'pendingForMe']);

    // Multi-level approval management (Admin only)
    Route::middleware('permission:users.manage')->group(function () {
        Route::get('/approval-levels', [App\Http\Controllers\Admin\ApprovalLevelController::class, 'index']);
        Route::post('/approval-levels', [App\Http\Controllers\Admin\ApprovalLevelController::class, 'store']);
        Route::get('/approval-levels/{id}', [App\Http\Controllers\Admin\ApprovalLevelController::class, 'show']);
        Route::put('/approval-levels/{id}', [App\Http\Controllers\Admin\ApprovalLevelController::class, 'update']);
        Route::delete('/approval-levels/{id}', [App\Http\Controllers\Admin\ApprovalLevelController::class, 'destroy']);
        Route::get('/approval-levels/{id}/approvers', [App\Http\Controllers\Admin\ApprovalLevelController::class, 'getApprovers']);
        Route::put('/approval-levels/{id}/toggle-active', [App\Http\Controllers\Admin\ApprovalLevelController::class, 'toggleActive']);
    });

    // Export routes
    Route::get('/quotations/{id}/export-pdf', [QuotationController::class, 'exportPDF']);
    Route::get('/quotations/{id}/print', [QuotationController::class, 'print']); // Template baru
    Route::get('/quotations/{id}/export-excel', [QuotationController::class, 'exportExcel']);

    // Dashboard routes
    Route::get('/dashboard', [DashboardController::class, 'getDashboardData'])->middleware('permission:dashboard.read');
    Route::get('/dashboard/admin', [DashboardController::class, 'adminDashboard'])->middleware('permission:dashboard.read');
    Route::get('/dashboard/sales', [DashboardController::class, 'salesDashboard'])->middleware('permission:dashboard.sales');
    Route::get('/dashboard/approval', [DashboardController::class, 'approvalDashboard']);//->middleware('permission:dashboard.approval');
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



    // Advanced Reports routes
    Route::get('/reports/sales-performance', [ReportController::class, 'salesPerformance'])->middleware('permission:reports.read');
    Route::get('/reports/inventory-turnover', [ReportController::class, 'inventoryTurnover'])->middleware('permission:reports.read');
    Route::get('/reports/financial-performance', [ReportController::class, 'financialPerformance'])->middleware('permission:reports.read');
    Route::get('/reports/customer-analysis', [ReportController::class, 'customerAnalysis'])->middleware('permission:reports.read');
    Route::post('/reports/export', [ReportController::class, 'exportReport'])->middleware('permission:reports.read');

    // Company Settings routes (Admin only)
    Route::apiResource('company-settings', CompanySettingsController::class)->middleware('super.admin.or.company.settings');
    Route::post('/company-settings/{id}', [CompanySettingsController::class, 'update'])->middleware('super.admin.or.company.settings');
    Route::post('/company-settings/upload-logo', [CompanySettingsController::class, 'uploadLogo'])->middleware('super.admin.or.company.settings');
    Route::delete('/company-settings/{id}/delete-logo', [CompanySettingsController::class, 'deleteLogo'])->middleware('super.admin.or.company.settings');



    // Warehouse Transfer Management
    Route::get('/warehouse-transfers', [App\Http\Controllers\API\WarehouseTransferController::class, 'index'])->middleware('permission:product-stock.read');
    Route::post('/warehouse-transfers', [App\Http\Controllers\API\WarehouseTransferController::class, 'store'])->middleware('permission:product-stock.create');
    Route::get('/warehouse-transfers/{id}', [App\Http\Controllers\API\WarehouseTransferController::class, 'show'])->middleware('permission:product-stock.read');
    Route::post('/warehouse-transfers/{id}/approve', [App\Http\Controllers\API\WarehouseTransferController::class, 'approve'])->middleware('permission:product-stock.update');
    Route::post('/warehouse-transfers/{id}/deliver', [App\Http\Controllers\API\WarehouseTransferController::class, 'deliver'])->middleware('permission:product-stock.update');
    Route::post('/warehouse-transfers/{id}/receive', [App\Http\Controllers\API\WarehouseTransferController::class, 'receive'])->middleware('permission:product-stock.update');
    Route::post('/warehouse-transfers/{id}/cancel', [App\Http\Controllers\API\WarehouseTransferController::class, 'cancel'])->middleware('permission:product-stock.delete');
    Route::get('/warehouse-transfers/statistics', [App\Http\Controllers\API\WarehouseTransferController::class, 'statistics'])->middleware('permission:product-stock.read');

    // Master Data Raw Products Management
    Route::post('/settings/raw-products/upload', [SettingsController::class, 'uploadRawProductsExcel'])->middleware('permission:products.create');
    Route::get('/settings/raw-products', [SettingsController::class, 'getRawProducts'])->middleware('permission:products.read');
    Route::get('/settings/raw-products/search', [SettingsController::class, 'searchRawProducts'])->middleware('permission:products.read');
    Route::get('/settings/raw-products/statistics', [SettingsController::class, 'getRawProductsStatistics'])->middleware('permission:products.read');
    Route::delete('/settings/raw-products/{id}', [SettingsController::class, 'deleteRawProduct'])->middleware('permission:products.delete');
    Route::post('/settings/raw-products/bulk-delete', [SettingsController::class, 'bulkDeleteRawProducts'])->middleware('permission:products.delete');
    Route::post('/settings/raw-products/import', [SettingsController::class, 'importToProducts'])->middleware('permission:products.create');
});