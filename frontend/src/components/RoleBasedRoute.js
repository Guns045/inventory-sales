import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect based on user role
  switch (user?.role?.name) {
    case 'Super Admin':
    case 'Admin':
      return <Navigate to="/dashboard" />;
    case 'Sales':
    case 'Sales Team':
      return <Navigate to="/dashboard/sales" />;
    case 'Gudang':
    case 'Warehouse Manager Gudang JKT':
    case 'Warehouse Manager Gudang MKS':
    case 'Warehouse Staff':
      return <Navigate to="/dashboard/warehouse" />;
    case 'Finance':
    case 'Finance Team':
      return <Navigate to="/dashboard/finance" />;
    default:
      return <Navigate to="/dashboard" />;
  }
};

export default RoleBasedRoute;