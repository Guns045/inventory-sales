<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\Approval;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\SalesOrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Admin Dashboard - Complete monitoring system
     */
    public function adminDashboard(Request $request)
    {
        try {
            $user = $request->user();

            // Critical Stock Alerts
            $criticalStocks = ProductStock::with('product')
                ->where('quantity', '<=', DB::raw('products.min_stock_level'))
                ->join('products', 'product_stocks.product_id', '=', 'products.id')
                ->orderBy('product_stocks.quantity', 'asc')
                ->take(10)
                ->get([
                    'product_stocks.*',
                    'products.name as product_name',
                    'products.sku',
                    'products.min_stock_level'
                ]);

            // Pending Approvals
            $pendingQuotations = Quotation::with(['customer', 'user'])
                ->where('status', 'SUBMITTED')
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();

            // Ready to Ship Orders
            $readyToShipOrders = SalesOrder::with(['customer'])
                ->where('status', 'READY_TO_SHIP')
                ->orderBy('updated_at', 'asc')
                ->take(10)
                ->get();

            // Today's Sales Summary
            $todaySales = SalesOrder::whereDate('created_at', today())
                ->whereIn('status', ['PENDING', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'])
                ->sum('total_amount');

            $todayOrders = SalesOrder::whereDate('created_at', today())->count();
            $todayCompletedOrders = SalesOrder::whereDate('created_at', today())
                ->where('status', 'COMPLETED')->count();

            // Monthly Sales Comparison
            $thisMonth = now()->startOfMonth();
            $lastMonth = now()->subMonth()->startOfMonth();

            $thisMonthSales = SalesOrder::where('created_at', '>=', $thisMonth)
                ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                ->sum('total_amount');

            $lastMonthSales = SalesOrder::where('created_at', '>=', $lastMonth)
                ->where('created_at', '<', $thisMonth)
                ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                ->sum('total_amount');

            // Recent Activities (last 24 hours)
            $recentActivities = ActivityLog::with('user')
                ->where('created_at', '>=', now()->subHours(24))
                ->orderBy('created_at', 'desc')
                ->take(20)
                ->get();

            // Unread Notifications for Admin
            $unreadNotifications = Notification::with('user')
                ->whereHas('user', function($query) use ($user) {
                    $query->whereHas('role', function($roleQuery) {
                        $roleQuery->where('name', 'Admin');
                    });
                })
                ->where('is_read', false)
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();

            // Inventory Summary
            $totalProducts = Product::count();
            $lowStockProducts = ProductStock::join('products', 'product_stocks.product_id', '=', 'products.id')
                ->where('product_stocks.quantity', '<=', DB::raw('products.min_stock_level'))
                ->count();

            $totalInventoryValue = ProductStock::join('products', 'product_stocks.product_id', '=', 'products.id')
                ->sum(DB::raw('product_stocks.quantity * products.buy_price'));

            // Customer & Supplier Summary
            $totalCustomers = Customer::count();
            $activeCustomers = Customer::whereHas('quotations')
                ->orWhereHas('salesOrders')
                ->count();

            $totalSuppliers = Supplier::count();

            // Approval Statistics
            $approvalStats = [
                'pending' => Quotation::where('status', 'SUBMITTED')->count(),
                'approved_today' => Approval::where('status', 'APPROVED')
                    ->whereDate('updated_at', today())->count(),
                'rejected_today' => Approval::where('status', 'REJECTED')
                    ->whereDate('updated_at', today())->count(),
                'total_approved_this_month' => Approval::where('status', 'APPROVED')
                    ->where('updated_at', '>=', $thisMonth)->count(),
            ];

            // Sales by Status
            $salesByStatus = SalesOrder::selectRaw('status, COUNT(*) as count, SUM(total_amount) as total')
                ->where('created_at', '>=', $thisMonth)
                ->groupBy('status')
                ->get();

            // Top Selling Products (this month)
            $topProducts = SalesOrderItem::selectRaw('
                    products.id,
                    products.name,
                    products.sku,
                    SUM(sales_order_items.quantity) as total_quantity,
                    SUM(sales_order_items.total_price) as total_revenue
                ')
                ->join('products', 'sales_order_items.product_id', '=', 'products.id')
                ->join('sales_orders', 'sales_order_items.sales_order_id', '=', 'sales_orders.id')
                ->where('sales_orders.created_at', '>=', $thisMonth)
                ->whereIn('sales_orders.status', ['SHIPPED', 'COMPLETED'])
                ->groupBy('products.id', 'products.name', 'products.sku')
                ->orderBy('total_revenue', 'desc')
                ->take(10)
                ->get();

            return response()->json([
                'summary' => [
                    'critical_stocks' => $criticalStocks->count(),
                    'pending_approvals' => $pendingQuotations->count(),
                    'ready_to_ship' => $readyToShipOrders->count(),
                    'today_sales' => $todaySales,
                    'today_orders' => $todayOrders,
                    'today_completed_orders' => $todayCompletedOrders,
                    'this_month_sales' => $thisMonthSales,
                    'last_month_sales' => $lastMonthSales,
                    'sales_growth' => $lastMonthSales > 0 ?
                        round((($thisMonthSales - $lastMonthSales) / $lastMonthSales) * 100, 2) : 0,
                ],
                'inventory' => [
                    'total_products' => $totalProducts,
                    'low_stock_products' => $lowStockProducts,
                    'total_inventory_value' => $totalInventoryValue,
                ],
                'business_summary' => [
                    'total_customers' => $totalCustomers,
                    'active_customers' => $activeCustomers,
                    'total_suppliers' => $totalSuppliers,
                ],
                'approval_stats' => $approvalStats,
                'critical_stocks' => $criticalStocks,
                'pending_quotations' => $pendingQuotations,
                'ready_to_ship_orders' => $readyToShipOrders,
                'recent_activities' => $recentActivities,
                'unread_notifications' => $unreadNotifications,
                'sales_by_status' => $salesByStatus,
                'top_products' => $topProducts,
            ]);

        } catch (\Exception $e) {
            \Log::error('Admin Dashboard Error: ' . $e->getMessage());

            return response()->json([
                'summary' => [
                    'critical_stocks' => 0,
                    'pending_approvals' => 0,
                    'ready_to_ship' => 0,
                    'today_sales' => 0,
                    'today_orders' => 0,
                    'today_completed_orders' => 0,
                    'this_month_sales' => 0,
                    'last_month_sales' => 0,
                    'sales_growth' => 0,
                ],
                'inventory' => [
                    'total_products' => 0,
                    'low_stock_products' => 0,
                    'total_inventory_value' => 0,
                ],
                'business_summary' => [
                    'total_customers' => 0,
                    'active_customers' => 0,
                    'total_suppliers' => 0,
                ],
                'approval_stats' => ['pending' => 0, 'approved_today' => 0, 'rejected_today' => 0, 'total_approved_this_month' => 0],
                'critical_stocks' => [],
                'pending_quotations' => [],
                'ready_to_ship_orders' => [],
                'recent_activities' => [],
                'unread_notifications' => [],
                'sales_by_status' => [],
                'top_products' => [],
            ]);
        }
    }

    public function salesDashboard(Request $request)
    {
        $user = $request->user();

        try {
            // Get user's quotations summary
            $quotations = Quotation::where('user_id', $user->id)
                ->with(['customer', 'quotationItems.product'])
                ->get();

            // Get user's sales orders
            $salesOrders = SalesOrder::where('user_id', $user->id)
                ->with(['customer', 'salesOrderItems.product'])
                ->get();

            // Calculate quotation statistics
            $quotationStats = [
                'draft' => $quotations->where('status', 'DRAFT')->count(),
                'approved' => $quotations->where('status', 'APPROVED')->count(),
                'rejected' => $quotations->where('status', 'REJECTED')->count(),
                'total' => $quotations->count()
            ];

            // Calculate sales order statistics
            $salesOrderStats = [
                'pending' => $salesOrders->where('status', 'PENDING')->count(),
                'processing' => $salesOrders->where('status', 'PROCESSING')->count(),
                'completed' => $salesOrders->where('status', 'COMPLETED')->count(),
                'total' => $salesOrders->count()
            ];

            // Calculate invoice statistics (dummy data for now)
            $invoiceStats = [
                'paid' => $salesOrders->where('status', 'COMPLETED')->count(),
                'unpaid' => $salesOrders->where('status', 'SHIPPED')->count(),
                'total' => $salesOrders->whereIn('status', ['SHIPPED', 'COMPLETED'])->count()
            ];

            // Get recent quotations with customer names
            $recentQuotations = $quotations->sortByDesc('created_at')->take(5)->map(function($quotation) {
                return [
                    'id' => $quotation->id,
                    'quotation_number' => $quotation->quotation_number ?? 'Q-' . date('Y-m-d') . '-' . str_pad($quotation->id, 3, '0', STR_PAD_LEFT),
                    'customer_name' => $quotation->customer ? $quotation->customer->company_name : 'Unknown Customer',
                    'total_amount' => $quotation->total_amount ?? 0,
                    'status' => $quotation->status
                ];
            })->values();

            // Get recent sales orders with customer names
            $recentSalesOrders = $salesOrders->sortByDesc('created_at')->take(5)->map(function($salesOrder) {
                return [
                    'id' => $salesOrder->id,
                    'sales_order_number' => $salesOrder->sales_order_number ?? 'SO-' . date('Y-m-d') . '-' . str_pad($salesOrder->id, 3, '0', STR_PAD_LEFT),
                    'customer_name' => $salesOrder->customer ? $salesOrder->customer->company_name : 'Unknown Customer',
                    'total_amount' => $salesOrder->total_amount ?? 0,
                    'status' => $salesOrder->status
                ];
            })->values();

            return response()->json([
                'quotations' => $quotationStats,
                'sales_orders' => $salesOrderStats,
                'invoices' => $invoiceStats,
                'recent_quotations' => $recentQuotations,
                'recent_sales_orders' => $recentSalesOrders
            ]);

        } catch (\Exception $e) {
            \Log::error('Sales Dashboard Error: ' . $e->getMessage());

            // Return default data structure on error
            return response()->json([
                'quotations' => ['draft' => 0, 'approved' => 0, 'rejected' => 0],
                'sales_orders' => ['pending' => 0, 'processing' => 0, 'completed' => 0],
                'invoices' => ['paid' => 0, 'unpaid' => 0],
                'recent_quotations' => [],
                'recent_sales_orders' => []
            ]);
        }
    }

    public function approvalDashboard(Request $request)
    {
        $user = $request->user();

        // Get quotations pending approval
        $pendingQuotations = Quotation::with(['customer', 'user', 'quotationItems.product'])
            ->where('status', 'SUBMITTED')
            ->orderBy('created_at', 'desc')
            ->get();

        // Add items as alias for frontend compatibility
        $pendingQuotations->each(function ($quotation) {
            $quotation->items = $quotation->quotationItems;
        });

        // Get approval statistics
        $approvalStats = [
            'pending' => $pendingQuotations->count(),
            'approved_today' => Approval::where('approver_id', $user->id)
                ->where('status', 'APPROVED')
                ->whereDate('updated_at', today())
                ->count(),
            'rejected_today' => Approval::where('approver_id', $user->id)
                ->where('status', 'REJECTED')
                ->whereDate('updated_at', today())
                ->count(),
            'total_approved' => Approval::where('approver_id', $user->id)
                ->where('status', 'APPROVED')
                ->count()
        ];

        // Get recent approvals by this manager
        $recentApprovals = Approval::where('approver_id', $user->id)
            ->with(['approvable.customer', 'approvable.user'])
            ->where('status', '!=', 'PENDING')
            ->orderBy('updated_at', 'desc')
            ->take(10)
            ->get();

        return response()->json([
            'pending_quotations' => $pendingQuotations,
            'approval_stats' => $approvalStats,
            'recent_approvals' => $recentApprovals
        ]);
    }

    public function warehouseDashboard(Request $request)
    {
        try {
            // Get sales orders statistics
            $salesOrderStats = [
                'pending' => SalesOrder::where('status', 'PENDING')->count(),
                'processing' => SalesOrder::where('status', 'PROCESSING')->count(),
                'ready' => SalesOrder::where('status', 'READY_TO_SHIP')->count()
            ];

            // Get delivery orders statistics (dummy data for now)
            $deliveryOrderStats = [
                'preparing' => SalesOrder::where('status', 'READY_TO_SHIP')->count(),
                'shipped' => SalesOrder::where('status', 'SHIPPED')->count(),
                'delivered' => SalesOrder::where('status', 'COMPLETED')->count()
            ];

            // Get pending pickings with customer names and priority
            $pendingPickings = SalesOrder::with(['customer'])
                ->where('status', 'PENDING')
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get()
                ->map(function($order) {
                    return [
                        'id' => $order->id,
                        'sales_order_number' => $order->sales_order_number ?? 'SO-' . date('Y-m-d') . '-' . str_pad($order->id, 3, '0', STR_PAD_LEFT),
                        'customer_name' => $order->customer ? $order->customer->company_name : 'Unknown Customer',
                        'total_items' => $order->salesOrderItems ? $order->salesOrderItems->sum('quantity') : 0,
                        'priority' => 'HIGH' // Dummy priority for now
                    ];
                })->values();

            // Get recent deliveries (dummy data for now)
            $recentDeliveries = SalesOrder::with(['customer'])
                ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                ->orderBy('updated_at', 'desc')
                ->take(5)
                ->get()
                ->map(function($order) {
                    return [
                        'id' => $order->id,
                        'delivery_order_number' => 'DO-' . date('Y-m-d') . '-' . str_pad($order->id, 3, '0', STR_PAD_LEFT),
                        'customer_name' => $order->customer ? $order->customer->company_name : 'Unknown Customer',
                        'shipping_date' => $order->updated_at ? $order->updated_at->format('Y-m-d') : date('Y-m-d'),
                        'status' => $order->status
                    ];
                })->values();

            // Get low stock items (dummy data for now)
            $lowStockItems = [
                [
                    'id' => 1,
                    'name' => 'Engine Oil 5W-30',
                    'sku' => 'OIL-001',
                    'current_stock' => 5,
                    'min_stock_level' => 10
                ]
            ];

            return response()->json([
                'sales_orders' => $salesOrderStats,
                'delivery_orders' => $deliveryOrderStats,
                'low_stock_items' => $lowStockItems,
                'pending_pickings' => $pendingPickings,
                'recent_deliveries' => $recentDeliveries
            ]);

        } catch (\Exception $e) {
            \Log::error('Warehouse Dashboard Error: ' . $e->getMessage());

            // Return default data structure on error
            return response()->json([
                'sales_orders' => ['pending' => 0, 'processing' => 0, 'ready' => 0],
                'delivery_orders' => ['preparing' => 0, 'shipped' => 0, 'delivered' => 0],
                'low_stock_items' => [],
                'pending_pickings' => [],
                'recent_deliveries' => []
            ]);
        }
    }

    public function financeDashboard(Request $request)
    {
        try {
            // Get invoice statistics
            $totalInvoices = SalesOrder::whereIn('status', ['SHIPPED', 'COMPLETED'])->count();
            $paidInvoices = SalesOrder::where('status', 'COMPLETED')->count();
            $unpaidInvoices = SalesOrder::where('status', 'SHIPPED')->count();
            $overdueInvoices = SalesOrder::where('status', 'SHIPPED')
                ->where('updated_at', '<', now()->subDays(30))
                ->count();

            $invoiceStats = [
                'total' => $totalInvoices,
                'paid' => $paidInvoices,
                'unpaid' => $unpaidInvoices,
                'overdue' => $overdueInvoices
            ];

            // Calculate payment statistics
            $thisMonthRevenue = SalesOrder::where('status', 'COMPLETED')
                ->where('updated_at', '>=', now()->startOfMonth())
                ->sum('total_amount');

            $outstandingPayments = SalesOrder::where('status', 'SHIPPED')
                ->sum('total_amount');

            $paymentStats = [
                'this_month' => $thisMonthRevenue,
                'outstanding' => $outstandingPayments
            ];

            // Get recent invoices
            $recentInvoices = SalesOrder::with(['customer'])
                ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get()
                ->map(function($order) {
                    return [
                        'id' => $order->id,
                        'invoice_number' => 'INV-' . date('Y-m-d') . '-' . str_pad($order->id, 3, '0', STR_PAD_LEFT),
                        'customer_name' => $order->customer ? $order->customer->company_name : 'Unknown Customer',
                        'total_amount' => $order->total_amount ?? 0,
                        'due_date' => $order->updated_at ? $order->updated_at->addDays(30)->format('Y-m-d') : date('Y-m-d', strtotime('+30 days')),
                        'status' => $order->status === 'COMPLETED' ? 'PAID' : 'UNPAID'
                    ];
                })->values();

            // Get top customers (dummy data for now)
            $topCustomers = [
                [
                    'id' => 1,
                    'name' => 'PT. Mega Corporation',
                    'total_invoices' => 12,
                    'total_revenue' => 250000000,
                    'last_invoice_date' => date('Y-m-d', strtotime('-3 days'))
                ],
                [
                    'id' => 2,
                    'name' => 'PT. ABC Company',
                    'total_invoices' => 8,
                    'total_revenue' => 180000000,
                    'last_invoice_date' => date('Y-m-d', strtotime('-7 days'))
                ]
            ];

            // Get monthly revenue data (dummy data for now)
            $monthlyRevenue = [
                [
                    'month' => date('Y-m', strtotime('-2 months')),
                    'revenue' => 95000000
                ],
                [
                    'month' => date('Y-m', strtotime('-1 month')),
                    'revenue' => 115000000
                ],
                [
                    'month' => date('Y-m'),
                    'revenue' => $thisMonthRevenue
                ]
            ];

            return response()->json([
                'invoices' => $invoiceStats,
                'payments' => $paymentStats,
                'recent_invoices' => $recentInvoices,
                'top_customers' => $topCustomers,
                'monthly_revenue' => $monthlyRevenue
            ]);

        } catch (\Exception $e) {
            \Log::error('Finance Dashboard Error: ' . $e->getMessage());

            // Return default data structure on error
            return response()->json([
                'invoices' => ['total' => 0, 'paid' => 0, 'unpaid' => 0, 'overdue' => 0],
                'payments' => ['this_month' => 0, 'outstanding' => 0],
                'recent_invoices' => [],
                'top_customers' => [],
                'monthly_revenue' => []
            ]);
        }
    }

    public function getDashboardData(Request $request)
    {
        $user = $request->user();
        $roleName = strtolower($user->role->name);

        switch ($roleName) {
            case 'sales':
                return $this->salesDashboard($request);
            case 'admin':
            case 'manager':
                return $this->adminDashboard($request);
            case 'gudang':
                return $this->warehouseDashboard($request);
            case 'finance':
                return $this->financeDashboard($request);
            default:
                return response()->json(['message' => 'Unauthorized dashboard access'], 403);
        }
    }

    /**
     * Stock Reports API
     */
    public function stockReports(Request $request)
    {
        try {
            // Stock Movement Summary (Last 30 days)
            $stockMovements = StockMovement::with(['product', 'warehouse'])
                ->where('created_at', '>=', now()->subDays(30))
                ->orderBy('created_at', 'desc')
                ->get();

            // Stock by Category
            $stockByCategory = DB::table('product_stocks')
                ->join('products', 'product_stocks.product_id', '=', 'products.id')
                ->join('categories', 'products.category_id', '=', 'categories.id')
                ->selectRaw('
                    categories.name as category_name,
                    COUNT(DISTINCT products.id) as product_count,
                    SUM(product_stocks.quantity) as total_quantity,
                    SUM(product_stocks.quantity * products.buy_price) as total_value
                ')
                ->groupBy('categories.id', 'categories.name')
                ->orderBy('total_value', 'desc')
                ->get();

            // Low Stock Products
            $lowStockProducts = ProductStock::with('product', 'warehouse')
                ->join('products', 'product_stocks.product_id', '=', 'products.id')
                ->where('product_stocks.quantity', '<=', DB::raw('products.min_stock_level'))
                ->orderBy('product_stocks.quantity', 'asc')
                ->get([
                    'product_stocks.*',
                    'products.name as product_name',
                    'products.sku',
                    'products.min_stock_level',
                    'products.buy_price'
                ]);

            // Stock Value by Warehouse
            $stockByWarehouse = DB::table('product_stocks')
                ->join('warehouses', 'product_stocks.warehouse_id', '=', 'warehouses.id')
                ->join('products', 'product_stocks.product_id', '=', 'products.id')
                ->selectRaw('
                    warehouses.name as warehouse_name,
                    COUNT(DISTINCT product_stocks.product_id) as product_count,
                    SUM(product_stocks.quantity) as total_quantity,
                    SUM(product_stocks.quantity * products.buy_price) as total_value
                ')
                ->groupBy('warehouses.id', 'warehouses.name')
                ->orderBy('total_value', 'desc')
                ->get();

            // Top Stock Movements (Last 30 days)
            $topMovements = StockMovement::selectRaw('
                    product_id,
                    products.name as product_name,
                    products.sku,
                    SUM(CASE WHEN movement_type = "IN" THEN quantity ELSE 0 END) as total_in,
                    SUM(CASE WHEN movement_type = "OUT" THEN quantity ELSE 0 END) as total_out,
                    COUNT(*) as movement_count
                ')
                ->join('products', 'stock_movements.product_id', '=', 'products.id')
                ->where('stock_movements.created_at', '>=', now()->subDays(30))
                ->groupBy('product_id', 'products.name', 'products.sku')
                ->orderBy('movement_count', 'desc')
                ->take(20)
                ->get();

            return response()->json([
                'stock_movements' => $stockMovements,
                'stock_by_category' => $stockByCategory,
                'low_stock_products' => $lowStockProducts,
                'stock_by_warehouse' => $stockByWarehouse,
                'top_movements' => $topMovements,
                'summary' => [
                    'total_products' => Product::count(),
                    'total_stock_value' => DB::table('product_stocks')
                        ->join('products', 'product_stocks.product_id', '=', 'products.id')
                        ->sum(DB::raw('product_stocks.quantity * products.buy_price')),
                    'low_stock_count' => $lowStockProducts->count(),
                    'total_movements_30_days' => $stockMovements->count(),
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Stock Reports Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate stock reports',
                'stock_movements' => [],
                'stock_by_category' => [],
                'low_stock_products' => [],
                'stock_by_warehouse' => [],
                'top_movements' => [],
                'summary' => [
                    'total_products' => 0,
                    'total_stock_value' => 0,
                    'low_stock_count' => 0,
                    'total_movements_30_days' => 0,
                ]
            ], 500);
        }
    }

    /**
     * Sales Reports API
     */
    public function salesReports(Request $request)
    {
        try {
            $dateFrom = $request->get('date_from', now()->startOfMonth());
            $dateTo = $request->get('date_to', now());

            // Daily Sales Trend
            $dailySales = SalesOrder::selectRaw('
                    DATE(created_at) as date,
                    COUNT(*) as order_count,
                    SUM(total_amount) as total_sales
                ')
                ->whereBetween('created_at', [$dateFrom, $dateTo])
                ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                ->groupBy('DATE(created_at)')
                ->orderBy('date')
                ->get();

            // Sales by Product
            $salesByProduct = SalesOrderItem::selectRaw('
                    products.id,
                    products.name as product_name,
                    products.sku,
                    SUM(sales_order_items.quantity) as total_quantity,
                    SUM(sales_order_items.total_price) as total_revenue,
                    COUNT(DISTINCT sales_order_items.sales_order_id) as order_count
                ')
                ->join('products', 'sales_order_items.product_id', '=', 'products.id')
                ->join('sales_orders', 'sales_order_items.sales_order_id', '=', 'sales_orders.id')
                ->whereBetween('sales_orders.created_at', [$dateFrom, $dateTo])
                ->whereIn('sales_orders.status', ['SHIPPED', 'COMPLETED'])
                ->groupBy('products.id', 'products.name', 'products.sku')
                ->orderBy('total_revenue', 'desc')
                ->take(20)
                ->get();

            // Sales by Customer
            $salesByCustomer = SalesOrder::selectRaw('
                    customers.id,
                    customers.company_name,
                    customers.contact_person,
                    COUNT(*) as order_count,
                    SUM(sales_orders.total_amount) as total_spent,
                    AVG(sales_orders.total_amount) as average_order_value
                ')
                ->join('customers', 'sales_orders.customer_id', '=', 'customers.id')
                ->whereBetween('sales_orders.created_at', [$dateFrom, $dateTo])
                ->whereIn('sales_orders.status', ['SHIPPED', 'COMPLETED'])
                ->groupBy('customers.id', 'customers.company_name', 'customers.contact_person')
                ->orderBy('total_spent', 'desc')
                ->take(20)
                ->get();

            // Sales by Sales Person
            $salesByUser = SalesOrder::selectRaw('
                    users.id,
                    users.name as sales_person,
                    COUNT(*) as order_count,
                    SUM(sales_orders.total_amount) as total_sales,
                    AVG(sales_orders.total_amount) as average_order_value
                ')
                ->join('users', 'sales_orders.user_id', '=', 'users.id')
                ->whereBetween('sales_orders.created_at', [$dateFrom, $dateTo])
                ->whereIn('sales_orders.status', ['SHIPPED', 'COMPLETED'])
                ->groupBy('users.id', 'users.name')
                ->orderBy('total_sales', 'desc')
                ->get();

            // Monthly Comparison (Last 12 months)
            $monthlyComparison = SalesOrder::selectRaw('
                    DATE_FORMAT(created_at, "%Y-%m") as month,
                    COUNT(*) as order_count,
                    SUM(total_amount) as total_sales
                ')
                ->where('created_at', '>=', now()->subMonths(12))
                ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            return response()->json([
                'daily_sales' => $dailySales,
                'sales_by_product' => $salesByProduct,
                'sales_by_customer' => $salesByCustomer,
                'sales_by_user' => $salesByUser,
                'monthly_comparison' => $monthlyComparison,
                'summary' => [
                    'total_orders' => $dailySales->sum('order_count'),
                    'total_revenue' => $dailySales->sum('total_sales'),
                    'average_order_value' => $dailySales->sum('order_count') > 0 ?
                        $dailySales->sum('total_sales') / $dailySales->sum('order_count') : 0,
                    'total_customers' => $salesByCustomer->count(),
                    'total_products_sold' => $salesByProduct->count(),
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Sales Reports Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate sales reports',
                'daily_sales' => [],
                'sales_by_product' => [],
                'sales_by_customer' => [],
                'sales_by_user' => [],
                'monthly_comparison' => [],
                'summary' => [
                    'total_orders' => 0,
                    'total_revenue' => 0,
                    'average_order_value' => 0,
                    'total_customers' => 0,
                    'total_products_sold' => 0,
                ]
            ], 500);
        }
    }
}