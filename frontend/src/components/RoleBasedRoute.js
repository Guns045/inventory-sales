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
    case 'Admin':
      return <Navigate to="/dashboard" />;
    case 'Sales':
      return <Navigate to="/dashboard/sales" />;
    case 'Gudang':
      return <Navigate to="/dashboard/warehouse" />;
    case 'Finance':
      return <Navigate to="/dashboard/finance" />;
    default:
      return <Navigate to="/dashboard" />;
  }
};

export default RoleBasedRoute;