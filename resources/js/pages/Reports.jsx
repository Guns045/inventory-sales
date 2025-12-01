import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { DataTable } from "@/components/common/DataTable";
import { Download, Calendar, TrendingUp, Package, Users, DollarSign, BarChart3, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAPI } from '@/contexts/APIContext';

const Reports = () => {
  const { api } = useAPI();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  // State for reports
  const [salesReport, setSalesReport] = useState({
    summary: { total_revenue: 0, total_orders: 0, avg_order_value: 0 },
    chartData: [],
    recentSales: []
  });

  const [stockReport, setStockReport] = useState({
    summary: { total_items: 0, low_stock: 0, stock_value: 0 },
    chartData: [],
    lowStockItems: []
  });

  const [financeReport, setFinanceReport] = useState({
    summary: { total_revenue: 0, total_payments: 0, outstanding: 0 },
    chartData: []
  });

  const [partnersReport, setPartnersReport] = useState({
    topCustomers: [],
    topSuppliers: []
  });

  useEffect(() => {
    fetchAllReports();
  }, [dateRange]);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.from) params.append('date_from', dateRange.from);
      if (dateRange.to) params.append('date_to', dateRange.to);
      const queryString = params.toString();

      const [salesRes, stockRes, financeRes, customerRes] = await Promise.all([
        api.get(`/reports/sales-performance?${queryString}`),
        api.get(`/reports/inventory-turnover?${queryString}`),
        api.get(`/reports/financial-performance?${queryString}`),
        api.get(`/reports/customer-analysis?${queryString}`)
      ]);

      // Process Sales Data
      const salesData = salesRes.data;
      const salesChart = Object.entries(salesData.sales_by_day || {}).map(([date, data]) => ({
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: data.revenue,
        profit: data.profit
      }));

      const recentOrdersRes = await api.get('/sales-orders?per_page=5&sort=-created_at');

      setSalesReport({
        summary: salesData.summary,
        chartData: salesChart,
        recentSales: recentOrdersRes.data.data || []
      });

      // Process Stock Data
      const stockData = stockRes.data;
      const stockByCategory = {};
      if (stockData.products) {
        stockData.products.forEach(p => {
          const cat = p.category || 'Uncategorized';
          stockByCategory[cat] = (stockByCategory[cat] || 0) + p.current_stock;
        });
      }
      const stockChart = Object.entries(stockByCategory).map(([name, stock]) => ({ name, stock }));

      setStockReport({
        summary: {
          total_items: stockData.summary.total_products,
          low_stock: (stockData.summary.out_of_stock_count || 0) + (stockData.summary.low_turnover_count || 0),
          stock_value: stockData.summary.total_current_value
        },
        chartData: stockChart,
        lowStockItems: (stockData.out_of_stock_products || []).concat(stockData.low_turnover_products || []).slice(0, 10)
      });

      // Process Finance Data
      const financeData = financeRes.data;
      const financeChart = (financeData.daily_revenue || []).map(d => ({
        name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        income: d.revenue,
        expenses: 0
      }));

      setFinanceReport({
        summary: {
          total_revenue: financeData.summary.total_revenue,
          total_payments: financeData.summary.total_payments,
          outstanding: financeData.summary.outstanding_receivables
        },
        chartData: financeChart
      });

      // Process Partners Data
      const customerData = customerRes.data;
      setPartnersReport({
        topCustomers: customerData.top_customers || [],
        topSuppliers: []
      });

    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatLargeCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}M`;
    return `Rp ${(amount / 1000).toFixed(1)}K`;
  };

  const salesColumns = [
    { header: "Date", accessorKey: "created_at", cell: (row) => new Date(row.created_at).toLocaleDateString() },
    { header: "Customer", accessorKey: "customer.company_name", cell: (row) => row.customer?.company_name || row.customer?.name },
    {
      header: "Amount",
      accessorKey: "total_amount",
      cell: (row) => formatCurrency(row.total_amount)
    },
    { header: "Status", accessorKey: "status" }
  ];

  const stockColumns = [
    { header: "Code", accessorKey: "code" },
    { header: "Product Name", accessorKey: "name" },
    {
      header: "Current Stock",
      accessorKey: "current_stock",
      cell: (row) => <span className="text-red-600 font-bold">{row.current_stock}</span>
    },
    { header: "Status", accessorKey: "status" }
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageHeader
        title="Reports"
        description="Comprehensive analytics and reporting"
      >
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-[150px]"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            className="w-[150px]"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          />
          <Button variant="outline" onClick={fetchAllReports}>
            <Download className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
          <TabsTrigger value="finance">Finance Report</TabsTrigger>
          <TabsTrigger value="partners">Customers & Suppliers</TabsTrigger>
        </TabsList>

        {/* Sales Report Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard title="Total Sales" value={formatLargeCurrency(salesReport.summary.total_revenue)} icon={<TrendingUp className="h-4 w-4" />} variant="primary" />
            <StatsCard title="Orders" value={salesReport.summary.total_orders} icon={<Package className="h-4 w-4" />} variant="info" />
            <StatsCard title="Avg. Order Value" value={formatLargeCurrency(salesReport.summary.avg_order_value)} icon={<DollarSign className="h-4 w-4" />} variant="success" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Daily sales performance</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                    <Bar dataKey="profit" fill="#10b981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest completed orders</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={salesColumns} data={salesReport.recentSales} loading={loading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Report Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard title="Total Items" value={stockReport.summary.total_items} icon={<Package className="h-4 w-4" />} variant="primary" />
            <StatsCard title="Low Stock / Issues" value={stockReport.summary.low_stock} icon={<BarChart3 className="h-4 w-4" />} variant="destructive" />
            <StatsCard title="Stock Value" value={formatLargeCurrency(stockReport.summary.stock_value)} icon={<DollarSign className="h-4 w-4" />} variant="success" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Distribution</CardTitle>
                <CardDescription>Inventory by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockReport.chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="stock" fill="#8884d8" name="Stock Level" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Low Stock / Slow Moving</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={stockColumns} data={stockReport.lowStockItems} loading={loading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Report Tab */}
        <TabsContent value="finance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard title="Total Revenue" value={formatLargeCurrency(financeReport.summary.total_revenue)} icon={<TrendingUp className="h-4 w-4" />} variant="primary" />
            <StatsCard title="Total Payments" value={formatLargeCurrency(financeReport.summary.total_payments)} icon={<DollarSign className="h-4 w-4" />} variant="success" />
            <StatsCard title="Outstanding" value={formatLargeCurrency(financeReport.summary.outstanding)} icon={<AlertCircle className="h-4 w-4" />} variant="destructive" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Income vs Expenses</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financeReport.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#3b82f6" name="Income" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partners Report Tab */}
        <TabsContent value="partners" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>By purchase volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {partnersReport.topCustomers.map((customer, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.total_orders} Orders</div>
                        </div>
                      </div>
                      <div className="font-bold">{formatLargeCurrency(customer.total_revenue)}</div>
                    </div>
                  ))}
                  {partnersReport.topCustomers.length === 0 && <div className="text-center text-muted-foreground">No data available</div>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers</CardTitle>
                <CardDescription>By purchase value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  Supplier data not yet available
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;