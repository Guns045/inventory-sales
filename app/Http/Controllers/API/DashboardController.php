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
use App\Models\Invoice;
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
                ->join('products', 'product_stock.product_id', '=', 'products.id')
                ->orderBy('product_stock.quantity', 'asc')
                ->take(10)
                ->get([
                    'product_stock.*',
                    'products.name as product_name',
                    'products.sku',
                    'products.min_stock_level'
                ]);

            // Pending Approvals
            DB::enableQueryLog();
            $pendingQuotations = Quotation::with(['customer', 'user'])
                ->where('status', 'SUBMITTED')
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();

            Log::info('Pending Quotations Query:', DB::getQueryLog());
            Log::info('Pending Quotations Count: ' . $pendingQuotations->count());

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
                ->whereHas('user', function ($query) use ($user) {
                    $query->whereHas('roles', function ($roleQuery) {
                        $roleQuery->where('name', 'Super Admin')
                            ->orWhere('name', 'Admin');
                    });
                })
                ->where('is_read', false)
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();

            // Inventory Summary
            $totalProducts = Product::count();
            $lowStockProducts = ProductStock::join('products', 'product_stock.product_id', '=', 'products.id')
                ->where('product_stock.quantity', '<=', DB::raw('products.min_stock_level'))
                ->count();

            $totalInventoryValue = ProductStock::join('products', 'product_stock.product_id', '=', 'products.id')
                ->sum(DB::raw('product_stock.quantity * products.buy_price'));

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
                    SUM(sales_order_items.quantity * sales_order_items.unit_price * (1 - sales_order_items.discount_percentage/100) * (1 + sales_order_items.tax_rate/100)) as total_revenue
                ')
                ->join('products', 'sales_order_items.product_id', '=', 'products.id')
                ->join('sales_orders', 'sales_order_items.sales_order_id', '=', 'sales_orders.id')
                ->where('sales_orders.created_at', '>=', $thisMonth)
                ->whereIn('sales_orders.status', ['SHIPPED', 'COMPLETED'])
                ->groupBy('products.id', 'products.name', 'products.sku')
                ->orderBy('total_revenue', 'desc')
                ->take(10)
                ->get();

            Log::info('Admin Dashboard: Data fetched successfully for user ' . $user->id);

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
                    'invoice_unpaid' => SalesOrder::where('status', 'SHIPPED')->sum('total_amount') +
                        Invoice::whereIn('status', ['UNPAID', 'PARTIAL'])->sum('total_amount'),
                    'month_orders' => SalesOrder::where('created_at', '>=', $thisMonth)->count(),
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
                'monthly_sales' => $this->getMonthlySalesData(),
                'recent_sales' => SalesOrder::with('customer')
                    ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get()
                    ->map(function ($order) {
                        return [
                            'id' => $order->id,
                            'name' => $order->customer->company_name,
                            'email' => $order->customer->email ?? 'N/A',
                            'amount' => $order->total_amount,
                            'avatar' => null // You can add logic for avatar if needed
                        ];
                    }),
            ]);

        } catch (\Exception $e) {
            Log::error('Admin Dashboard Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'error' => $e->getMessage(), // Expose error to frontend
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
                ->with(['customer', 'salesOrderItems.product', 'quotation'])
                ->get();

            // Calculate quotation statistics
            $quotationStats = [
                'draft' => $quotations->where('status', 'DRAFT')->count(),
                'submitted' => $quotations->where('status', 'SUBMITTED')->count(),
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
            $recentQuotations = $quotations->sortByDesc('created_at')->take(5)->map(function ($quotation) {
                return [
                    'id' => $quotation->id,
                    'quotation_number' => $quotation->quotation_number ?? 'Q-' . date('Y-m-d') . '-' . str_pad($quotation->id, 3, '0', STR_PAD_LEFT),
                    'customer_name' => $quotation->customer ? $quotation->customer->company_name : 'Unknown Customer',
                    'total_amount' => $quotation->total_amount ?? 0,
                    'status' => $quotation->status
                ];
            })->values();

            // Get recent sales orders with customer names
            $recentSalesOrders = $salesOrders->sortByDesc('created_at')->take(5)->map(function ($salesOrder) {
                return [
                    'id' => $salesOrder->id,
                    'sales_order_number' => $salesOrder->sales_order_number ?? 'SO-' . date('Y-m-d') . '-' . str_pad($salesOrder->id, 3, '0', STR_PAD_LEFT),
                    'quotation_number' => $salesOrder->quotation ? $salesOrder->quotation->quotation_number : null,
                    'customer_name' => $salesOrder->customer ? $salesOrder->customer->company_name : 'Unknown Customer',
                    'total_amount' => $salesOrder->total_amount ?? 0,
                    'status' => $salesOrder->status
                ];
            })->values();

            // Get approval notifications (recently approved/rejected quotations)
            $approvalNotifications = \App\Models\Approval::whereHasMorph('approvable', [Quotation::class], function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
                ->whereIn('status', ['APPROVED', 'REJECTED'])
                ->orderBy('updated_at', 'desc')
                ->take(5)
                ->with(['approvable', 'approver'])
                ->get();

            return response()->json([
                'quotation_stats' => $quotationStats,
                'sales_order_stats' => $salesOrderStats,
                'invoice_stats' => $invoiceStats,
                'recent_quotations' => $recentQuotations,
                'recent_sales_orders' => $recentSalesOrders,
                'approval_notifications' => $approvalNotifications
            ]);

        } catch (\Exception $e) {
            \Log::error('Sales Dashboard Error: ' . $e->getMessage());

            // Return default data structure on error
            return response()->json([
                'quotation_stats' => ['draft' => 0, 'approved' => 0, 'rejected' => 0, 'submitted' => 0],
                'sales_order_stats' => ['pending' => 0, 'processing' => 0, 'completed' => 0],
                'invoice_stats' => ['paid' => 0, 'unpaid' => 0],
                'recent_quotations' => [],
                'recent_sales_orders' => [],
                'approval_notifications' => []
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
            // Get Pending Sales Orders (Limit 50)
            $pendingOrders = SalesOrder::with(['customer', 'user', 'salesOrderItems.product'])
                ->where('status', 'PENDING')
                ->orderBy('created_at', 'asc')
                ->take(50)
                ->get();

            // Get Processing Sales Orders (Limit 50)
            $processingOrders = SalesOrder::with(['customer', 'user', 'salesOrderItems.product'])
                ->where('status', 'PROCESSING')
                ->orderBy('updated_at', 'asc')
                ->take(50)
                ->get();

            // Get Ready to Ship Orders (Limit 50)
            $readyToShipOrders = SalesOrder::with(['customer', 'user', 'salesOrderItems.product'])
                ->where('status', 'READY_TO_SHIP')
                ->orderBy('updated_at', 'asc')
                ->take(50)
                ->get();

            // Transform orders to include 'items' alias for frontend compatibility
            $transformOrders = function ($orders) {
                return $orders->each(function ($order) {
                    $order->setRelation('items', $order->salesOrderItems);
                });
            };

            $transformOrders($pendingOrders);
            $transformOrders($processingOrders);
            $transformOrders($readyToShipOrders);

            // Calculate Stats (Count all)
            $warehouseStats = [
                'pending_processing' => SalesOrder::where('status', 'PENDING')->count(),
                'processing' => SalesOrder::where('status', 'PROCESSING')->count(),
                'ready_to_ship' => SalesOrder::where('status', 'READY_TO_SHIP')->count(),
                'total_orders' => SalesOrder::count(),
            ];

            $data = [
                'pending_sales_orders' => $pendingOrders,
                'processing_sales_orders' => $processingOrders,
                'ready_to_ship_orders' => $readyToShipOrders,
                'warehouse_stats' => $warehouseStats,
            ];

            // Explicitly encode to catch serialization errors
            $json = json_encode($data);
            if ($json === false) {
                throw new \Exception('JSON Encode Error: ' . json_last_error_msg());
            }

            return response($json)->header('Content-Type', 'application/json');

        } catch (\Throwable $e) {
            \Log::error('Warehouse Dashboard Error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());

            // Return default data structure on error
            return response()->json([
                'error' => $e->getMessage(),
                'pending_sales_orders' => [],
                'processing_sales_orders' => [],
                'ready_to_ship_orders' => [],
                'warehouse_stats' => [
                    'pending_processing' => 0,
                    'processing' => 0,
                    'ready_to_ship' => 0,
                    'total_orders' => 0,
                ],
            ]); // Return 200 to avoid crashing frontend completely, but show empty state
        }
    }

    public function financeDashboard(Request $request)
    {
        try {
            // Get Shipped Sales Orders (Ready for Invoicing)
            $shippedOrders = SalesOrder::with(['customer', 'items.product', 'quotation'])
                ->where('status', 'SHIPPED')
                ->orderBy('updated_at', 'desc')
                ->get();

            // Get Completed Sales Orders (Already Invoiced/Paid)
            $completedOrders = SalesOrder::with(['customer', 'items.product'])
                ->where('status', 'COMPLETED')
                ->orderBy('updated_at', 'desc')
                ->take(10)
                ->get();

            // Calculate Finance Summary
            $totalReceivable = SalesOrder::where('status', 'SHIPPED')->sum('total_amount');
            $monthlyRevenue = SalesOrder::where('status', 'COMPLETED')
                ->where('updated_at', '>=', now()->startOfMonth())
                ->sum('total_amount');
            $pendingInvoices = SalesOrder::where('status', 'SHIPPED')->count();
            $totalOrders = SalesOrder::count();

            $financeSummary = [
                'total_receivable' => $totalReceivable,
                'monthly_revenue' => $monthlyRevenue,
                'pending_invoices' => $pendingInvoices,
                'total_orders' => $totalOrders
            ];

            return response()->json([
                'shipped_sales_orders' => $shippedOrders,
                'completed_sales_orders' => $completedOrders,
                'finance_summary' => $financeSummary
            ]);

        } catch (\Exception $e) {
            \Log::error('Finance Dashboard Error: ' . $e->getMessage());

            // Return default data structure on error
            return response()->json([
                'shipped_sales_orders' => [],
                'completed_sales_orders' => [],
                'finance_summary' => [
                    'total_receivable' => 0,
                    'monthly_revenue' => 0,
                    'pending_invoices' => 0,
                    'total_orders' => 0
                ]
            ]);
        }
    }

    public function getDashboardData(Request $request)
    {
        $user = $request->user();
        $roleName = $user->role ? strtolower($user->role->name) : '';

        switch ($roleName) {
            case 'super admin':
            case 'admin':
            case 'manager':
            case 'administrator':
                return $this->adminDashboard($request);
            case 'sales':
                return $this->salesDashboard($request);
            case 'gudang':
            case 'warehouse':
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
            $stockByCategory = DB::table('product_stock')
                ->join('products', 'product_stock.product_id', '=', 'products.id')
                ->join('categories', 'products.category_id', '=', 'categories.id')
                ->selectRaw('
                    categories.name as category_name,
                    COUNT(DISTINCT products.id) as product_count,
                    SUM(product_stock.quantity) as total_quantity,
                    SUM(product_stock.quantity * products.buy_price) as total_value
                ')
                ->groupBy('categories.id', 'categories.name')
                ->orderBy('total_value', 'desc')
                ->get();

            // Low Stock Products
            $lowStockProducts = ProductStock::with('product', 'warehouse')
                ->join('products', 'product_stock.product_id', '=', 'products.id')
                ->where('product_stock.quantity', '<=', DB::raw('products.min_stock_level'))
                ->orderBy('product_stock.quantity', 'asc')
                ->get([
                    'product_stock.*',
                    'products.name as product_name',
                    'products.sku',
                    'products.min_stock_level',
                    'products.buy_price'
                ]);

            // Stock Value by Warehouse
            $stockByWarehouse = DB::table('product_stock')
                ->join('warehouses', 'product_stock.warehouse_id', '=', 'warehouses.id')
                ->join('products', 'product_stock.product_id', '=', 'products.id')
                ->selectRaw('
                    warehouses.name as warehouse_name,
                    COUNT(DISTINCT product_stock.product_id) as product_count,
                    SUM(product_stock.quantity) as total_quantity,
                    SUM(product_stock.quantity * products.buy_price) as total_value
                ')
                ->groupBy('warehouses.id', 'warehouses.name')
                ->orderBy('total_value', 'desc')
                ->get();

            // Top Stock Movements (Last 30 days)
            $topMovements = StockMovement::selectRaw('
                    product_id,
                    products.name as product_name,
                    products.sku,
                    SUM(CASE WHEN type = "IN" THEN quantity_change ELSE 0 END) as total_in,
                    SUM(CASE WHEN type = "OUT" THEN quantity_change ELSE 0 END) as total_out,
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
                    'total_stock_value' => DB::table('product_stock')
                        ->join('products', 'product_stock.product_id', '=', 'products.id')
                        ->sum(DB::raw('product_stock.quantity * products.buy_price')),
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
                    DATE_FORMAT(created_at, "%Y-%m-%d") as date,
                    COUNT(*) as order_count,
                    SUM(total_amount) as total_sales
                ')
                ->whereBetween('created_at', [$dateFrom, $dateTo])
                ->whereIn('status', ['SHIPPED', 'COMPLETED'])
                ->groupByRaw('DATE_FORMAT(created_at, "%Y-%m-%d")')
                ->orderBy('date')
                ->get();

            // Sales by Product
            $salesByProduct = SalesOrderItem::selectRaw('
                    products.id,
                    products.name as product_name,
                    products.sku,
                    SUM(sales_order_items.quantity) as total_quantity,
                    SUM(sales_order_items.quantity * sales_order_items.unit_price * (1 - sales_order_items.discount_percentage/100) * (1 + sales_order_items.tax_rate/100)) as total_revenue,
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
                ->groupByRaw('DATE_FORMAT(created_at, "%Y-%m")')
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

    private function getMonthlySalesData()
    {
        $rawData = SalesOrder::selectRaw('
                DATE_FORMAT(created_at, "%Y-%m") as month_key,
                DATE_FORMAT(created_at, "%b") as name,
                SUM(total_amount) as revenue,
                COUNT(*) as sales
            ')
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->whereIn('status', ['SHIPPED', 'COMPLETED'])
            ->groupByRaw('DATE_FORMAT(created_at, "%Y-%m"), DATE_FORMAT(created_at, "%b")')
            ->get()
            ->keyBy('month_key');

        $data = [];
        $current = now()->subMonths(11)->startOfMonth();

        for ($i = 0; $i < 12; $i++) {
            $key = $current->format('Y-m');
            $name = $current->format('M');

            $record = $rawData->get($key);

            $data[] = [
                'name' => $name,
                'revenue' => $record ? (float) $record->revenue : 0,
                'sales' => $record ? (int) $record->sales : 0,
            ];

            $current->addMonth();
        }

        return $data;
    }
}