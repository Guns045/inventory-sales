import React from 'react';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import DashboardAdmin from './DashboardAdmin';
import DashboardSales from './DashboardSales';
import DashboardWarehouse from './DashboardWarehouse';
import DashboardFinance from './DashboardFinance';

const Dashboard = () => {
  const { user } = useAuth();

  const getUserRole = () => {
    if (!user || !user.role) return 'default';
    return user.role.name;
  };

  const renderRoleBasedDashboard = () => {
    const role = getUserRole();

    switch (role) {
      case 'Super Admin':
      case 'Admin':
      case 'manager':
        return <DashboardAdmin />;
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