import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SalesDashboard from '../components/dashboard/SalesDashboard';
import ApprovalDashboard from '../components/dashboard/ApprovalDashboard';
import WarehouseDashboard from '../components/dashboard/WarehouseDashboard';
import FinanceDashboard from '../components/dashboard/FinanceDashboard';

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
        return <SalesDashboard />;
      case 'admin':
      case 'manager':
        return <ApprovalDashboard />;
      case 'gudang':
        return <WarehouseDashboard />;
      case 'finance':
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