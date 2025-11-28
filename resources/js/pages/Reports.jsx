import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { DataTable } from "@/components/common/DataTable";
import { Download, Calendar, TrendingUp, Package, Users, DollarSign, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const Reports = () => {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Mock Data for Charts
  const salesData = [
    { name: 'Jan', sales: 4000, profit: 2400 },
    { name: 'Feb', sales: 3000, profit: 1398 },
    { name: 'Mar', sales: 2000, profit: 9800 },
    { name: 'Apr', sales: 2780, profit: 3908 },
    { name: 'May', sales: 1890, profit: 4800 },
    { name: 'Jun', sales: 2390, profit: 3800 },
  ];

  const stockData = [
    { name: 'Electronics', stock: 120 },
    { name: 'Clothing', stock: 200 },
    { name: 'Home', stock: 150 },
    { name: 'Garden', stock: 80 },
    { name: 'Toys', stock: 100 },
  ];

  // Mock Data for Tables
  const recentSales = [
    { id: 1, date: '2024-03-01', customer: 'PT. Maju Jaya', amount: 15000000, status: 'Completed' },
    { id: 2, date: '2024-03-02', customer: 'CV. Berkah', amount: 8500000, status: 'Pending' },
    { id: 3, date: '2024-03-03', customer: 'Toko Abadi', amount: 3200000, status: 'Completed' },
  ];

  const lowStockItems = [
    { id: 1, code: 'EL-001', name: 'Laptop Gaming', stock: 2, min: 5 },
    { id: 2, code: 'CL-023', name: 'T-Shirt XL', stock: 10, min: 20 },
    { id: 3, code: 'HM-104', name: 'Coffee Maker', stock: 0, min: 3 },
  ];

  const salesColumns = [
    { header: "Date", accessorKey: "date" },
    { header: "Customer", accessorKey: "customer" },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (row) => `Rp ${row.amount.toLocaleString('id-ID')}`
    },
    { header: "Status", accessorKey: "status" }
  ];

  const stockColumns = [
    { header: "Code", accessorKey: "code" },
    { header: "Product Name", accessorKey: "name" },
    {
      header: "Current Stock",
      accessorKey: "stock",
      cell: (row) => <span className="text-red-600 font-bold">{row.stock}</span>
    },
    { header: "Min Stock", accessorKey: "min" }
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageHeader
        title="Reports"
        description="Comprehensive analytics and reporting"
      >
        <div className="flex items-center gap-2">
          <Input type="date" className="w-[150px]" />
          <span className="text-muted-foreground">-</span>
          <Input type="date" className="w-[150px]" />
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
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
            <StatsCard title="Total Sales" value="Rp 1.2B" icon={<TrendingUp className="h-4 w-4" />} variant="primary" />
            <StatsCard title="Orders" value="1,234" icon={<Package className="h-4 w-4" />} variant="info" />
            <StatsCard title="Avg. Order Value" value="Rp 950K" icon={<DollarSign className="h-4 w-4" />} variant="success" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Monthly sales performance</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
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
                <DataTable columns={salesColumns} data={recentSales} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Report Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard title="Total Items" value="452" icon={<Package className="h-4 w-4" />} variant="primary" />
            <StatsCard title="Low Stock" value="12" icon={<BarChart3 className="h-4 w-4" />} variant="destructive" />
            <StatsCard title="Stock Value" value="Rp 450M" icon={<DollarSign className="h-4 w-4" />} variant="success" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Distribution</CardTitle>
                <CardDescription>Inventory by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockData} layout="vertical">
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
                <CardTitle>Low Stock Alert</CardTitle>
                <CardDescription>Items below minimum threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={stockColumns} data={lowStockItems} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Report Tab */}
        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Income vs Expenses</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Income" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#ef4444" name="Expenses" strokeWidth={2} />
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
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {i}
                        </div>
                        <div>
                          <div className="font-medium">Customer {String.fromCharCode(64 + i)}</div>
                          <div className="text-xs text-muted-foreground">50 Orders</div>
                        </div>
                      </div>
                      <div className="font-bold">Rp {(100 - i * 10)}M</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers</CardTitle>
                <CardDescription>By purchase value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                          {i}
                        </div>
                        <div>
                          <div className="font-medium">Supplier {String.fromCharCode(87 + i)}</div>
                          <div className="text-xs text-muted-foreground">Active since 2023</div>
                        </div>
                      </div>
                      <div className="font-bold">Rp {(80 - i * 8)}M</div>
                    </div>
                  ))}
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