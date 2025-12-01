import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { useAPI } from '../../contexts/APIContext';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  Plus,
  ShoppingCart,
  Users
} from "lucide-react";

const SalesDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { api } = useAPI();

  useEffect(() => {
    console.log('SalesDashboard mounted');
    fetchSalesDashboard();
  }, []);

  const fetchSalesDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/sales');
      setDashboardData(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching sales dashboard:', error);
      setError('Failed to load sales dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  const { quotation_stats, recent_quotations, approval_notifications } = dashboardData;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
          <p className="text-muted-foreground">Quotations Summary and Notifications</p>
        </div>
        <Button variant="outline" onClick={fetchSalesDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotation_stats.draft}</div>
            <p className="text-xs text-muted-foreground">Draft Quotations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotation_stats.submitted}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotation_stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotation_stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Quotations */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Quotations</CardTitle>
              <CardDescription>List of recently created quotations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/quotations">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recent_quotations.length > 0 ? (
                recent_quotations.map((quotation) => (
                  <div key={quotation.id} className="flex items-center">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">{quotation.quotation_number}</p>
                        <Badge variant={getStatusBadgeVariant(quotation.status)}>{quotation.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quotation.customer?.company_name || 'Unknown Customer'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(quotation.total_amount)}</div>
                        <p className="text-xs text-muted-foreground">{new Date(quotation.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                      <Button variant="outline" size="icon" asChild>
                        <Link to={`/quotations/${quotation.id}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No quotations found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approval Notifications */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Approval Notifications</CardTitle>
            <CardDescription>Latest approval status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {approval_notifications.length > 0 ? (
                approval_notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-4">
                    <div className={`mt-1 rounded-full p-1 ${notification.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {notification.status === 'APPROVED' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.approvable?.quotation_number || 'Unknown Quotation'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notification.status === 'APPROVED'
                          ? `Approved by ${notification.approver?.name || 'Manager'}`
                          : `Rejected by ${notification.approver?.name || 'Manager'}`
                        }
                      </p>
                      {notification.notes && (
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          Note: {notification.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.updated_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/quotations/${notification.approvable_id}`}>
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No notifications
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
};

export default SalesDashboard;