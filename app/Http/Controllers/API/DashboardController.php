<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\Approval;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function salesDashboard(Request $request)
    {
        $user = $request->user();

        // Get user's quotations summary
        $quotations = Quotation::where('user_id', $user->id)
            ->with(['customer', 'quotationItems.product'])
            ->get();

        // Add items as alias for frontend compatibility
        $quotations->each(function ($quotation) {
            $quotation->items = $quotation->quotationItems;
        });

        $quotationStats = [
            'draft' => $quotations->where('status', 'DRAFT')->count(),
            'submitted' => $quotations->where('status', 'SUBMITTED')->count(),
            'approved' => $quotations->where('status', 'APPROVED')->count(),
            'rejected' => $quotations->where('status', 'REJECTED')->count(),
            'total' => $quotations->count()
        ];

        // Get recent quotations
        $recentQuotations = $quotations->sortByDesc('created_at')->take(5);

        // Get sales target (dummy data for now)
        $salesTarget = [
            'monthly_target' => 50000000, // 50 million
            'current_achievement' => $quotations
                ->where('status', 'APPROVED')
                ->where('created_at', '>=', now()->startOfMonth())
                ->sum('total_amount'),
            'percentage' => 0
        ];

        if ($salesTarget['monthly_target'] > 0) {
            $salesTarget['percentage'] = ($salesTarget['current_achievement'] / $salesTarget['monthly_target']) * 100;
        }

        // Get approval notifications
        $approvalNotifications = Approval::where('approvable_type', Quotation::class)
            ->whereHas('approvable', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->where('status', '!=', 'PENDING')
            ->with(['approvable.customer', 'approver'])
            ->orderBy('updated_at', 'desc')
            ->take(10)
            ->get();

        return response()->json([
            'quotation_stats' => $quotationStats,
            'recent_quotations' => $recentQuotations->values(),
            'sales_target' => $salesTarget,
            'approval_notifications' => $approvalNotifications,
            'total_quotations' => $quotationStats['total'],
            'pending_approvals' => $quotationStats['submitted']
        ]);
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
        // Get sales orders that are pending processing
        $pendingSalesOrders = SalesOrder::with(['customer', 'salesOrderItems.product'])
            ->where('status', 'PENDING')
            ->orderBy('created_at', 'desc')
            ->get();

        // Get processing sales orders
        $processingSalesOrders = SalesOrder::with(['customer', 'salesOrderItems.product'])
            ->where('status', 'PROCESSING')
            ->orderBy('created_at', 'desc')
            ->get();

        // Get ready to ship orders
        $readyToShipOrders = SalesOrder::with(['customer', 'salesOrderItems.product'])
            ->where('status', 'READY_TO_SHIP')
            ->orderBy('created_at', 'desc')
            ->get();

        // Add items as alias for frontend compatibility
        $pendingSalesOrders->each(function ($order) {
            $order->items = $order->salesOrderItems;
        });
        $processingSalesOrders->each(function ($order) {
            $order->items = $order->salesOrderItems;
        });
        $readyToShipOrders->each(function ($order) {
            $order->items = $order->salesOrderItems;
        });

        // Get warehouse statistics
        $warehouseStats = [
            'pending_processing' => $pendingSalesOrders->count(),
            'processing' => $processingSalesOrders->count(),
            'ready_to_ship' => $readyToShipOrders->count(),
            'total_orders' => $pendingSalesOrders->count() + $processingSalesOrders->count() + $readyToShipOrders->count()
        ];

        return response()->json([
            'pending_sales_orders' => $pendingSalesOrders,
            'processing_sales_orders' => $processingSalesOrders,
            'ready_to_ship_orders' => $readyToShipOrders,
            'warehouse_stats' => $warehouseStats
        ]);
    }

    public function financeDashboard(Request $request)
    {
        // Get sales orders that are shipped (ready for invoicing)
        $shippedSalesOrders = SalesOrder::with(['customer', 'salesOrderItems.product', 'quotation'])
            ->where('status', 'SHIPPED')
            ->orderBy('created_at', 'desc')
            ->get();

        // Get completed orders (already invoiced)
        $completedSalesOrders = SalesOrder::with(['customer', 'salesOrderItems.product'])
            ->where('status', 'COMPLETED')
            ->orderBy('updated_at', 'desc')
            ->take(20)
            ->get();

        // Add items as alias for frontend compatibility
        $shippedSalesOrders->each(function ($order) {
            $order->items = $order->salesOrderItems;
        });
        $completedSalesOrders->each(function ($order) {
            $order->items = $order->salesOrderItems;
        });

        // Calculate financial summaries
        $financeSummary = [
            'total_receivable' => $shippedSalesOrders->sum('total_amount'),
            'monthly_revenue' => $completedSalesOrders
                ->where('updated_at', '>=', now()->startOfMonth())
                ->sum('total_amount'),
            'total_orders' => $shippedSalesOrders->count() + $completedSalesOrders->count(),
            'pending_invoices' => $shippedSalesOrders->count()
        ];

        return response()->json([
            'shipped_sales_orders' => $shippedSalesOrders,
            'completed_sales_orders' => $completedSalesOrders,
            'finance_summary' => $financeSummary
        ]);
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
                return $this->approvalDashboard($request);
            case 'gudang':
                return $this->warehouseDashboard($request);
            case 'finance':
                return $this->financeDashboard($request);
            default:
                return response()->json(['message' => 'Unauthorized dashboard access'], 403);
        }
    }
}