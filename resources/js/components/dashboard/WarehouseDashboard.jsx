import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAPI } from '../../contexts/APIContext';
import {
  RefreshCw,
  Package,
  AlertTriangle,
  XCircle,
  Building
} from "lucide-react";

const WarehouseDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { api } = useAPI();

  useEffect(() => {
    fetchWarehouseDashboard();
  }, []);

  const fetchWarehouseDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/warehouse');
      setDashboardData(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching warehouse dashboard:', error);
      setError('Failed to load warehouse dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const { low_stock_products, out_stock_products, warehouse_stats } = dashboardData;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Warehouse Dashboard</h2>
          <p className="text-muted-foreground">Monitor Stock Health and Alerts</p>
        </div>
        <Button variant="outline" onClick={fetchWarehouseDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse_stats.total_stock}</div>
            <p className="text-xs text-muted-foreground">Total items in warehouse</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse_stats.low_stock_count}</div>
            <p className="text-xs text-muted-foreground">Products below min. level</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse_stats.out_stock_count}</div>
            <p className="text-xs text-muted-foreground">Products with 0 quantity</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {/* Low Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Products
            </CardTitle>
            <CardDescription>Restock recommended for these items</CardDescription>
          </CardHeader>
          <CardContent>
            {low_stock_products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Min. Level</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {low_stock_products.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell className="font-medium">{stock.sku}</TableCell>
                      <TableCell>{stock.product_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            {stock.warehouse?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{stock.min_stock_level}</TableCell>
                      <TableCell className="text-right font-bold text-yellow-600">{stock.quantity}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Low Stock</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No low stock alerts. Inventory levels are healthy.</p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Out of Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Out of Stock Products
            </CardTitle>
            <CardDescription>Immediate attention required</CardDescription>
          </CardHeader>
          <CardContent>
            {out_stock_products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Min. Level</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {out_stock_products.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell className="font-medium">{stock.sku}</TableCell>
                      <TableCell>{stock.product_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            {stock.warehouse?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{stock.min_stock_level}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{stock.quantity}</TableCell>
                      <TableCell>
                         <Badge variant="destructive">Out of Stock</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No out of stock items.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WarehouseDashboard;