import React, { useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import DashboardMain from './DashboardMain';
import DashboardSales from './DashboardSales';
import DashboardWarehouse from './DashboardWarehouse';
import DashboardFinance from './DashboardFinance';

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
    console.log('🎉 Dashboard component mounted, user:', user);
    console.log('🎉 User role:', getUserRole());
  }, [user]);

  const getUserRole = () => {
    if (!user) return 'default';

    // Check for Spatie roles array
    if (user.roles && user.roles.length > 0) {
      return user.roles[0].name;
    }

    // Check for single role object (legacy/fallback)
    if (user.role) {
      return user.role.name;
    }

    return 'default';
  };

  const renderRoleBasedDashboard = () => {
    const role = getUserRole();

    switch (role) {
      case 'Super Admin':
      case 'Admin':
      case 'manager':
        return <DashboardMain />;
      case 'Sales':
      case 'Sales Team':
        return <DashboardSales />;
      case 'Gudang':
      case 'Warehouse Manager Gudang JKT':
      case 'Warehouse Manager Gudang MKS':
      case 'Warehouse Staff':
        return <DashboardWarehouse />;
      case 'Finance':
      case 'Finance Team':
        return <DashboardFinance />;
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
            <p className="text-muted mb-0">Ringkasan Sistem Manajemen Inventaris & Penjualan</p>
          </div>
        </div>

        <Alert variant="info">
          <Alert.Heading>Selamat Datang!</Alert.Heading>
          <p>Role Anda belum dikonfigurasi dengan dashboard khusus. Silakan hubungi administrator untuk mengatur role Anda.</p>
          <hr />
          <p className="mb-0">
            Role Anda: {user?.role?.name || 'Unknown'}
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