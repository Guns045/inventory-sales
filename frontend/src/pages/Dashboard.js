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
    return user.role.name.toLowerCase();
  };

  const renderRoleBasedDashboard = () => {
    const role = getUserRole();

    switch (role) {
      case 'sales':
        return <DashboardSales />;
      case 'admin':
      case 'manager':
        return <DashboardAdmin />;
      case 'gudang':
        return <DashboardWarehouse />;
      case 'finance':
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
            Role yang tersedia: Sales, Admin/Manager, Gudang, Finance
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