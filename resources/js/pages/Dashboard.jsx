import React, { useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import SalesDashboard from '../components/dashboard/SalesDashboard';
import WarehouseDashboard from '../components/dashboard/WarehouseDashboard';
import FinanceDashboard from '../components/dashboard/FinanceDashboard';

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

  const renderRoleBasedDashboard = () => {
    const role = getUserRole();

    switch (role) {
      case 'Super Admin':
      case 'Admin':
      case 'manager':
      case 'Sales':
      case 'Sales Team':
        return <SalesDashboard />;
      case 'Gudang':
      case 'Warehouse':
      case 'Warehouse Manager Gudang JKT':
      case 'Warehouse Manager Gudang MKS':
      case 'Warehouse Staff':
        return <WarehouseDashboard />;
      case 'Finance':
      case 'Finance Team':
        return <FinanceDashboard />;
      default:
        return <DefaultDashboard />;
    }
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
            Your Role: {user?.role?.name || 'Unknown'}
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