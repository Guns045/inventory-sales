import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Overview } from "@/components/dashboard/Overview";
import { RecentSales } from "@/components/dashboard/RecentSales";
import CriticalStockTable from "@/components/dashboard/CriticalStockTable";
import ApprovalTable from "@/components/dashboard/ApprovalTable";
import { DollarSign, Users, CreditCard, Activity } from "lucide-react";
import { useAPI } from '@/contexts/APIContext';

export default function DashboardMain() {
  const { api } = useAPI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await api.get('/dashboard/admin');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // If error is 403, it might be role issue, handled by backend error response now
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Use real data if available, otherwise fallback to defaults/loading state
  const summary = data?.summary || {};
  const criticalStocks = data?.critical_stocks || [];
  const pendingApprovals = data?.pending_quotations || [];

  if (data?.error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Dashboard Error: </strong>
          <span className="block sm:inline">{data.error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {/* Top Stats Row - Removed Low Stock Card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.this_month_sales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.sales_growth > 0 ? '+' : ''}{summary.sales_growth || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending_approvals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Quotations waiting for approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.ready_to_ship || 0}</div>
            <p className="text-xs text-muted-foreground">
              Orders currently in transit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Sales Revenue</CardTitle>
            <CardDescription>
              Revenue performance over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={data?.monthly_sales || []} />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <div className="text-sm text-muted-foreground">
              You made {summary.today_orders || 0} sales today.
            </div>
          </CardHeader>
          <CardContent>
            <RecentSales data={data?.recent_sales || []} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - New Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="col-span-1">
          <CriticalStockTable items={criticalStocks} />
        </div>
        <div className="col-span-1">
          <ApprovalTable items={pendingApprovals} onRefresh={fetchData} />
        </div>
      </div>
    </div>
  );
}