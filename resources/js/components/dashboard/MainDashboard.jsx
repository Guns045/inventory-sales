import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Overview } from "./Overview";
import { RecentSales } from "./RecentSales";
import CriticalStockTable from "./CriticalStockTable";
import ApprovalTable from "./ApprovalTable";
import { DollarSign, ShoppingCart, Package, Activity } from "lucide-react";
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const MainDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const fetchData = async () => {
        try {
            const response = await axios.get('/api/dashboard', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });
            setData(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    if (loading) {
        return <div className="p-8 text-center">Loading dashboard data...</div>;
    }

    if (!data) {
        return <div className="p-8 text-center text-red-500">Failed to load dashboard data.</div>;
    }

    const { summary, monthly_sales, recent_sales, critical_stocks, pending_quotations } = data;

    return (
        <div className="flex-1 space-y-4 p-4 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(summary.this_month_sales)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {summary.sales_growth > 0 ? '+' : ''}{summary.sales_growth}% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Month Order</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.month_orders}</div>
                        <p className="text-xs text-muted-foreground">
                            Total order per month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Invoice Unpaid</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                                summary.invoice_unpaid || 0
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total unpaid invoices
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(summary.today_sales)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Today's revenue
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview data={monthly_sales} />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RecentSales data={recent_sales} />
                    </CardContent>
                </Card>
            </div>

            {/* Tables Row */}
            <div className="grid gap-4 md:grid-cols-2">
                <CriticalStockTable items={critical_stocks} />
                <ApprovalTable items={pending_quotations} onRefresh={fetchData} />
            </div>
        </div>
    );
};

export default MainDashboard;
