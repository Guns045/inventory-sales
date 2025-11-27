import React, { useState } from 'react';
import StatCard from '../components/dashboard/StatCard';
import SalesRevenueChart from '../components/dashboard/SalesRevenueChart';
import ActivityLog from '../components/dashboard/ActivityLog';
import CriticalStockTable from '../components/dashboard/CriticalStockTable';
import ApprovalTable from '../components/dashboard/ApprovalTable';
import Spinner from '../components/ui/Spinner';
import useDashboardData from '../hooks/useDashboardData';
import { formatCurrency, formatNumber } from '../utils/formatters';

const DashboardPage = () => {
    // Mock user data - in real app this would come from context or API
    const [user, setUser] = useState({
        name: 'Admin User',
        role: 'admin',
        email: 'admin@example.com'
    });

    // Use custom hook for data fetching
    const { data, loading, error, refreshData } = useDashboardData();

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-center">
                    <Spinner size="xl" color="indigo" />
                    <p className="mt-4 text-zinc-500 dark:text-zinc-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md border border-zinc-200 dark:border-zinc-800">
                    <h3 className="mt-2 text-lg font-medium text-zinc-900 dark:text-white">Failed to load data</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
                    <div className="mt-6">
                        <button
                            onClick={refreshData}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { stats, chartData, activities, criticalStock, approvals } = data;

    return (
        <div className="space-y-4 animate-fade-in p-8 pt-6">
            {/* Page Header */}
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    <div className="hidden md:flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-md">
                        <button className="px-3 py-1 text-sm font-medium rounded-sm bg-white dark:bg-zinc-950 shadow text-zinc-900 dark:text-zinc-50">Overview</button>
                        <button className="px-3 py-1 text-sm font-medium rounded-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">Analytics</button>
                        <button className="px-3 py-1 text-sm font-medium rounded-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">Reports</button>
                        <button className="px-3 py-1 text-sm font-medium rounded-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">Notifications</button>
                    </div>
                    <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 h-9 px-4 py-2">
                        Download
                    </button>
                </div>
            </div>

            {/* Tabs Content Area */}
            <div className="space-y-4">
                {/* Top Row: KPI Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        title="Total Revenue"
                        value={formatCurrency(stats.revenue.value)}
                        trend="+20.1%"
                        trendDirection="up"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        }
                    />

                    <StatCard
                        title="Total Sales"
                        value={formatNumber(stats.sales.value)}
                        trend="+19%"
                        trendDirection="up"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                                <rect width="20" height="14" x="2" y="5" rx="2" />
                                <path d="M2 10h20" />
                            </svg>
                        }
                    />

                    <StatCard
                        title="Pending Approvals"
                        value={approvals.length.toString()}
                        trend={`${approvals.length} pending`}
                        trendDirection="neutral"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        }
                    />
                </div>

                {/* Middle Row: Chart & Activity Log */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    {/* Sales vs Revenue Chart (4/7 width) */}
                    <div className="col-span-4 h-full">
                        <SalesRevenueChart data={chartData} type="bar" />
                    </div>

                    {/* Recent Sales / Activity Log (3/7 width) */}
                    <div className="col-span-3 h-full">
                        <ActivityLog activities={activities} />
                    </div>
                </div>

                {/* Bottom Row: Tables */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                    {/* Critical Stock Table */}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <h3 className="font-semibold leading-none tracking-tight">Critical Stock</h3>
                        </div>
                        <div className="p-6 pt-0">
                            <CriticalStockTable products={criticalStock} />
                        </div>
                    </div>

                    {/* Approval Table */}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <h3 className="font-semibold leading-none tracking-tight">Pending Approvals</h3>
                        </div>
                        <div className="p-6 pt-0">
                            <ApprovalTable
                                approvals={approvals.map(item => ({
                                    ...item,
                                    amount: formatCurrency(item.amount)
                                }))}
                                onApprove={(id) => console.log('Approved', id)}
                                onReject={(id) => console.log('Rejected', id)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
