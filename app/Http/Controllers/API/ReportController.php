<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use App\Models\Product;
use App\Models\Customer;
use App\Models\StockMovement;
use App\Models\ProductStock;
use App\Models\Category;
use App\Models\Payment;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReportController extends Controller
{
    public function __construct()
    {
        // Middleware is handled in routes/api.php
    }

    /**
     * Sales Performance Report
     */
    public function salesPerformance(Request $request)
    {
        try {
            $dateFrom = $request->get('date_from', now()->startOfMonth());
            $dateTo = $request->get('date_to', now()->endOfMonth());
            $customerFilter = $request->get('customer_id');
            $productFilter = $request->get('product_id');
            $categoryFilter = $request->get('category_id');

            $dateFrom = Carbon::parse($dateFrom);
            $dateTo = Carbon::parse($dateTo);

            // Base query for sales orders
            $salesQuery = SalesOrder::with(['customer', 'items.product'])
                ->whereBetween('created_at', [$dateFrom, $dateTo])
                ->whereIn('status', ['PROCESSING', 'COMPLETED']);

            // Apply filters
            if ($customerFilter) {
                $salesQuery->where('customer_id', $customerFilter);
            }

            if ($productFilter) {
                $salesQuery->whereHas('items', function ($q) use ($productFilter) {
                    $q->where('product_id', $productFilter);
                });
            }

            if ($categoryFilter) {
                $salesQuery->whereHas('items.product', function ($q) use ($categoryFilter) {
                    $q->where('category_id', $categoryFilter);
                });
            }

            $salesOrders = $salesQuery->get();

            // Calculate metrics
            $totalRevenue = 0;
            $totalProfit = 0;
            $totalQuantity = 0;
            $salesByProduct = [];
            $salesByCustomer = [];
            $salesByDay = [];
            $profitByProduct = [];
            $topCustomers = [];

            foreach ($salesOrders as $order) {
                $orderRevenue = $order->total_amount;
                $orderProfit = 0;
                $orderQuantity = 0;

                // Sales by day
                $date = $order->created_at->format('Y-m-d');
                if (!isset($salesByDay[$date])) {
                    $salesByDay[$date] = ['revenue' => 0, 'orders' => 0, 'profit' => 0];
                }
                $salesByDay[$date]['revenue'] += $orderRevenue;
                $salesByDay[$date]['orders'] += 1;

                // Sales by customer
                $customerId = $order->customer_id;
                $customerName = $order->customer->company_name;
                if (!isset($salesByCustomer[$customerId])) {
                    $salesByCustomer[$customerId] = [
                        'name' => $customerName,
                        'revenue' => 0,
                        'orders' => 0,
                        'quantity' => 0
                    ];
                }
                $salesByCustomer[$customerId]['revenue'] += $orderRevenue;
                $salesByCustomer[$customerId]['orders'] += 1;

                foreach ($order->items as $item) {
                    $product = $item->product;
                    $quantity = $item->quantity;
                    $revenue = $item->quantity * $item->unit_price;
                    $cost = $quantity * ($product->buy_price ?? 0);
                    $profit = $revenue - $cost;

                    $orderProfit += $profit;
                    $orderQuantity += $quantity;

                    // Sales by product
                    if (!isset($salesByProduct[$product->id])) {
                        $salesByProduct[$product->id] = [
                            'name' => $product->name,
                            'code' => $product->sku,
                            'quantity' => 0,
                            'revenue' => 0,
                            'profit' => 0
                        ];
                    }
                    $salesByProduct[$product->id]['quantity'] += $quantity;
                    $salesByProduct[$product->id]['revenue'] += $revenue;
                    $salesByProduct[$product->id]['profit'] += $profit;

                    $salesByCustomer[$customerId]['quantity'] += $quantity;
                }

                $totalRevenue += $orderRevenue;
                $totalProfit += $orderProfit;
                $totalQuantity += $orderQuantity;
                $salesByDay[$date]['profit'] += $orderProfit;
            }

            // Sort and get top performers
            uasort($salesByProduct, function ($a, $b) {
                return $b['revenue'] <=> $a['revenue'];
            });

            uasort($salesByCustomer, function ($a, $b) {
                return $b['revenue'] <=> $a['revenue'];
            });

            $topProducts = array_slice($salesByProduct, 0, 10, true);
            $topCustomers = array_slice($salesByCustomer, 0, 10, true);

            // Calculate averages
            $avgOrderValue = count($salesOrders) > 0 ? $totalRevenue / count($salesOrders) : 0;
            $profitMargin = $totalRevenue > 0 ? ($totalProfit / $totalRevenue) * 100 : 0;

            return response()->json([
                'summary' => [
                    'total_revenue' => $totalRevenue,
                    'total_profit' => $totalProfit,
                    'profit_margin' => round($profitMargin, 2),
                    'total_orders' => count($salesOrders),
                    'total_quantity' => $totalQuantity,
                    'avg_order_value' => round($avgOrderValue, 2),
                    'period' => [
                        'from' => $dateFrom->format('Y-m-d'),
                        'to' => $dateTo->format('Y-m-d')
                    ]
                ],
                'sales_by_day' => $salesByDay,
                'top_products' => $topProducts,
                'top_customers' => $topCustomers,
                'sales_by_product' => array_values($salesByProduct),
                'sales_by_customer' => array_values($salesByCustomer)
            ]);

        } catch (\Exception $e) {
            Log::error('Sales Performance Report Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate sales performance report',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Inventory Turnover Report
     */
    public function inventoryTurnover(Request $request)
    {
        try {
            $period = $request->get('period', '12'); // Default 12 months
            $categoryFilter = $request->get('category_id');
            $warehouseFilter = $request->get('warehouse_id');

            $endDate = now();
            $startDate = now()->subMonths($period);

            // Get all products with their stock and sales data
            $productsQuery = Product::with(['category', 'productStock']);

            if ($categoryFilter) {
                $productsQuery->where('category_id', $categoryFilter);
            }

            $products = $productsQuery->get();

            $inventoryData = [];
            $totalCurrentValue = 0;
            $totalCostOfGoodsSold = 0;
            $lowTurnoverProducts = [];
            $outOfStockProducts = [];

            foreach ($products as $product) {
                // Current stock
                $currentStock = $product->productStock->sum('quantity') ?? 0;
                $unitCost = $product->buy_price ?? 0;
                $currentValue = $currentStock * $unitCost;

                // Get sales data for the period
                $salesData = DB::table('sales_order_items')
                    ->join('sales_orders', 'sales_order_items.sales_order_id', '=', 'sales_orders.id')
                    ->where('sales_order_items.product_id', $product->id)
                    ->whereBetween('sales_orders.created_at', [$startDate, $endDate])
                    ->whereIn('sales_orders.status', ['PROCESSING', 'COMPLETED'])
                    ->selectRaw('SUM(sales_order_items.quantity) as total_sold, SUM(sales_order_items.quantity * sales_order_items.unit_price) as total_revenue')
                    ->first();

                $totalSold = $salesData->total_sold ?? 0;
                $totalRevenue = $salesData->total_revenue ?? 0;
                $costOfGoodsSold = $totalSold * $unitCost;

                // Calculate turnover metrics
                $avgInventory = ($currentStock + $totalSold) / 2;
                $turnoverRatio = $avgInventory > 0 ? $totalSold / $avgInventory : 0;
                $daysOfSupply = $totalSold > 0 ? ($currentStock / $totalSold) * $period * 30 : 999;

                // Calculate inventory holding cost (assuming 25% annual holding cost)
                $holdingCost = ($currentValue * 0.25) * ($period / 12);

                $productData = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->sku,
                    'category' => $product->category->name ?? 'Uncategorized',
                    'current_stock' => $currentStock,
                    'unit_cost' => $unitCost,
                    'current_value' => $currentValue,
                    'total_sold' => $totalSold,
                    'total_revenue' => $totalRevenue,
                    'cost_of_goods_sold' => $costOfGoodsSold,
                    'avg_inventory' => round($avgInventory, 2),
                    'turnover_ratio' => round($turnoverRatio, 2),
                    'days_of_supply' => round($daysOfSupply, 0),
                    'holding_cost' => round($holdingCost, 2),
                    'status' => $this->getInventoryStatus($currentStock, $daysOfSupply)
                ];

                $inventoryData[] = $productData;
                $totalCurrentValue += $currentValue;
                $totalCostOfGoodsSold += $costOfGoodsSold;

                // Identify low turnover and out of stock products
                if ($currentStock === 0 && $totalSold > 0) {
                    $outOfStockProducts[] = $productData;
                } elseif ($turnoverRatio < 1 && $currentStock > 0) {
                    $lowTurnoverProducts[] = $productData;
                }
            }

            // Calculate overall metrics
            $overallTurnoverRatio = $totalCurrentValue > 0 ? $totalCostOfGoodsSold / $totalCurrentValue : 0;
            $totalHoldingCost = $totalCurrentValue * 0.25 * ($period / 12);

            // Sort by turnover ratio
            usort($inventoryData, function ($a, $b) {
                return $b['turnover_ratio'] <=> $a['turnover_ratio'];
            });

            return response()->json([
                'summary' => [
                    'total_products' => count($products),
                    'total_current_value' => $totalCurrentValue,
                    'total_cost_of_goods_sold' => $totalCostOfGoodsSold,
                    'overall_turnover_ratio' => round($overallTurnoverRatio, 2),
                    'total_holding_cost' => round($totalHoldingCost, 2),
                    'out_of_stock_count' => count($outOfStockProducts),
                    'low_turnover_count' => count($lowTurnoverProducts),
                    'period_months' => $period
                ],
                'products' => $inventoryData,
                'out_of_stock_products' => $outOfStockProducts,
                'low_turnover_products' => $lowTurnoverProducts
            ]);

        } catch (\Exception $e) {
            Log::error('Inventory Turnover Report Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate inventory turnover report',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Financial Performance Report
     */
    public function financialPerformance(Request $request)
    {
        try {
            $dateFrom = $request->get('date_from', now()->startOfMonth());
            $dateTo = $request->get('date_to', now()->endOfMonth());

            $dateFrom = Carbon::parse($dateFrom);
            $dateTo = Carbon::parse($dateTo);

            // Revenue data
            $revenueData = SalesOrder::whereBetween('created_at', [$dateFrom, $dateTo])
                ->whereIn('status', ['PROCESSING', 'COMPLETED'])
                ->selectRaw('DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders')
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Payment data
            $paymentData = Payment::whereBetween('payment_date', [$dateFrom, $dateTo])
                // ->where('status', 'completed') // Status column does not exist in Payment model
                ->selectRaw('DATE(payment_date) as date, SUM(amount_paid) as payments, COUNT(*) as payment_count')
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Invoice data
            $invoiceData = Invoice::whereBetween('created_at', [$dateFrom, $dateTo])
                ->selectRaw('DATE(created_at) as date, SUM(total_amount) as invoiced_amount, COUNT(*) as invoice_count')
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Outstanding receivables
            // Outstanding receivables (Total amount of unpaid invoices - total payments for those invoices)
            $outstandingReceivables = Invoice::whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])
                ->where('due_date', '<', now())
                ->withSum('payments', 'amount_paid')
                ->get()
                ->sum(function ($invoice) {
                    return $invoice->total_amount - ($invoice->payments_sum_amount_paid ?? 0);
                });

            // Cash flow summary
            $totalRevenue = $revenueData->sum('revenue');
            $totalPayments = $paymentData->sum('payments');
            $totalInvoiced = $invoiceData->sum('invoiced_amount');
            $totalPaidInvoices = $totalPayments; // Use total payments as proxy for paid amount

            return response()->json([
                'summary' => [
                    'total_revenue' => $totalRevenue,
                    'total_payments' => $totalPayments,
                    'total_invoiced' => $totalInvoiced,
                    'total_paid' => $totalPaidInvoices,
                    'outstanding_receivables' => $outstandingReceivables,
                    'payment_collection_rate' => $totalInvoiced > 0 ? round(($totalPaidInvoices / $totalInvoiced) * 100, 2) : 0,
                    'period' => [
                        'from' => $dateFrom->format('Y-m-d'),
                        'to' => $dateTo->format('Y-m-d')
                    ]
                ],
                'daily_revenue' => $revenueData,
                'daily_payments' => $paymentData,
                'daily_invoices' => $invoiceData
            ]);

        } catch (\Exception $e) {
            Log::error('Financial Performance Report Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate financial performance report',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Customer Analysis Report
     */
    public function customerAnalysis(Request $request)
    {
        try {
            $dateFrom = $request->get('date_from', now()->subMonths(12));
            $dateTo = $request->get('date_to', now());

            $dateFrom = Carbon::parse($dateFrom);
            $dateTo = Carbon::parse($dateTo);

            // Customer sales data
            $customerData = Customer::with([
                'salesOrders' => function ($query) use ($dateFrom, $dateTo) {
                    $query->whereBetween('created_at', [$dateFrom, $dateTo])
                        ->whereIn('status', ['PROCESSING', 'COMPLETED']);
                }
            ])
                ->whereHas('salesOrders', function ($query) use ($dateFrom, $dateTo) {
                    $query->whereBetween('created_at', [$dateFrom, $dateTo]);
                })
                ->get();

            $analysisData = [];
            $totalCustomers = $customerData->count();
            $newCustomers = Customer::whereBetween('created_at', [$dateFrom, $dateTo])->count();

            foreach ($customerData as $customer) {
                $totalOrders = $customer->salesOrders->count();
                $totalRevenue = $customer->salesOrders->sum('total_amount');
                $avgOrderValue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;

                // First order date
                $firstOrder = $customer->salesOrders->sortBy('created_at')->first();
                $lastOrder = $customer->salesOrders->sortByDesc('created_at')->first();

                $customerAnalysis = [
                    'id' => $customer->id,
                    'name' => $customer->company_name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'company' => $customer->company_name,
                    'total_orders' => $totalOrders,
                    'total_revenue' => $totalRevenue,
                    'avg_order_value' => round($avgOrderValue, 2),
                    'first_order_date' => $firstOrder ? $firstOrder->created_at->format('Y-m-d') : null,
                    'last_order_date' => $lastOrder ? $lastOrder->created_at->format('Y-m-d') : null,
                    'customer_lifetime_days' => $firstOrder ? $firstOrder->created_at->diffInDays(now()) : 0,
                    'segment' => $this->getCustomerSegment($totalRevenue, $totalOrders)
                ];

                $analysisData[] = $customerAnalysis;
            }

            // Sort by revenue
            usort($analysisData, function ($a, $b) {
                return $b['total_revenue'] <=> $a['total_revenue'];
            });

            // Customer segments
            $segments = [];
            foreach ($analysisData as $customer) {
                $segment = $customer['segment'];
                if (!isset($segments[$segment])) {
                    $segments[$segment] = ['count' => 0, 'revenue' => 0];
                }
                $segments[$segment]['count']++;
                $segments[$segment]['revenue'] += $customer['total_revenue'];
            }

            return response()->json([
                'summary' => [
                    'total_customers' => $totalCustomers,
                    'new_customers' => $newCustomers,
                    'total_revenue' => array_sum(array_column($analysisData, 'total_revenue')),
                    'avg_revenue_per_customer' => $totalCustomers > 0 ? round(array_sum(array_column($analysisData, 'total_revenue')) / $totalCustomers, 2) : 0,
                    'period' => [
                        'from' => $dateFrom->format('Y-m-d'),
                        'to' => $dateTo->format('Y-m-d')
                    ]
                ],
                'customers' => $analysisData,
                'segments' => $segments,
                'top_customers' => array_slice($analysisData, 0, 10)
            ]);

        } catch (\Exception $e) {
            Log::error('Customer Analysis Report Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate customer analysis report',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report to PDF/Excel
     */
    public function exportReport(Request $request)
    {
        try {
            $reportType = $request->get('report_type');
            $format = $request->get('format', 'pdf'); // pdf or excel
            $filters = $request->except(['report_type', 'format']);

            // Generate report data based on type
            switch ($reportType) {
                case 'sales_performance':
                    $data = $this->salesPerformance(new Request($filters))->getData();
                    break;
                case 'inventory_turnover':
                    $data = $this->inventoryTurnover(new Request($filters))->getData();
                    break;
                case 'financial_performance':
                    $data = $this->financialPerformance(new Request($filters))->getData();
                    break;
                case 'customer_analysis':
                    $data = $this->customerAnalysis(new Request($filters))->getData();
                    break;
                default:
                    return response()->json(['error' => 'Invalid report type'], 400);
            }

            // For now, return data. In a real implementation, you would generate PDF/Excel files
            return response()->json([
                'message' => 'Export functionality would be implemented here',
                'data' => $data,
                'format' => $format,
                'report_type' => $reportType
            ]);

        } catch (\Exception $e) {
            Log::error('Export Report Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to export report',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method to get inventory status
     */
    private function getInventoryStatus($stock, $daysOfSupply)
    {
        if ($stock === 0) {
            return 'Out of Stock';
        } elseif ($daysOfSupply < 7) {
            return 'Critical';
        } elseif ($daysOfSupply < 30) {
            return 'Low';
        } elseif ($daysOfSupply > 90) {
            return 'Overstock';
        } else {
            return 'Normal';
        }
    }

    /**
     * Helper method to get customer segment
     */
    private function getCustomerSegment($revenue, $orders)
    {
        if ($revenue >= 100000000 && $orders >= 10) {
            return 'VIP';
        } elseif ($revenue >= 50000000 && $orders >= 5) {
            return 'Premium';
        } elseif ($revenue >= 10000000 || $orders >= 3) {
            return 'Regular';
        } else {
            return 'Occasional';
        }
    }
}