import React, { useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import SalesDashboard from '../components/dashboard/SalesDashboard';
import WarehouseDashboard from '../components/dashboard/WarehouseDashboard';
import FinanceDashboard from '../components/dashboard/FinanceDashboard';
import MainDashboard from '../components/dashboard/MainDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  // Debug mounting
  useEffect(() => {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
      debugInfo.innerHTML = `
        <div>🎉 SUCCESS: Dashboard Component Mounted!</div>
        <div>User: ${user ? user.name : 'Not loaded'}</div>
        <div>Role: ${user && user.role ? user.role.name : 'Not loaded'}</div>
        <div>Rendering dashboard for role: ${getUserRole()}</div>
        <div>Time: ${new Date().toLocaleTimeString()}</div>
      `;
    }


  }, [user]);

  const getUserRole = () => {
    if (!user) return 'default';

    // Check for Spatie roles array
    if (user.roles && user.roles.length > 0) {
      return user.roles[0].name;
    }

    // Check for single role property (string or object)
    if (user.role) {
      return typeof user.role === 'string' ? user.role : user.role.name;
    }

    return 'default';
  };

  const hasPermission = (permission) => {
    if (!user || (!user.permissions && !user.roles)) return false;

    // Check if user has direct permissions array (from API resource)
    if (user.permissions && user.permissions.includes(permission)) return true;

    // Check roles/permissions structure if different (Admin typically has all)
    if (user.roles?.some(r => r.name === 'Super Admin')) return true;

    return false;
  };

  const renderRoleBasedDashboard = () => {
    const role = getUserRole();

    // 1. Super Admin / Admin -> Main Dashboard
    if (['Super Admin', 'Admin'].includes(role)) {
      return <MainDashboard />;
    }

    // 2. Role based checks
    if (['manager', 'Sales', 'Sales Team'].includes(role)) {
      return <SalesDashboard />;
    }

    if (['Gudang', 'Warehouse', 'Warehouse Manager Gudang JKT', 'Warehouse Manager Gudang MKS', 'Warehouse Staff'].includes(role)) {
      return <WarehouseDashboard />;
    }

    if (['Finance', 'Finance Team'].includes(role)) {
      return <FinanceDashboard />;
    }

    // 3. Permission based checks for Custom Roles (fallback)
    // If custom role has stock view permission, allow Warehouse Dashboard view
    if (hasPermission('view_stock') || hasPermission('product-stock.read')) {
      return <WarehouseDashboard />;
    }

    // If custom role has sales permissions
    if (hasPermission('view_sales_orders') || hasPermission('sales-orders.read')) {
      return <SalesDashboard />;
    }

    return <DefaultDashboard />;
  };

  const DefaultDashboard = () => {
    return (
      <div>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Dashboard</h2>
            <p className="text-muted mb-0">Inventory & Sales Management System Summary</p>
          </div>
        </div>

        <Alert variant="info">
          <Alert.Heading>Welcome!</Alert.Heading>
          <p>Your role has not been configured with a specific dashboard. Please contact the administrator to set up your role.</p>
          <hr />
          <p className="mb-0">
            Your Role: {(typeof user?.role === 'string' ? user.role : user?.role?.name) || 'Unknown'}
          </p>
        </Alert>
      </div>
    );
  };

  return (
    <div>
      {renderRoleBasedDashboard()}
    </div>
  );
};

export default Dashboard;