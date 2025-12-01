import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRoute = ({ children }) => {
  const { user } = useAuth();




  if (!user) {

    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  switch (user?.role?.name) {
    case 'Super Admin':
    case 'Admin':

      return <Navigate to="/dashboard" replace />;
    case 'Sales':
    case 'Sales Team':

      return <Navigate to="/dashboard/sales" replace />;
    case 'Manager Jakarta':
    case 'Manager Makassar':
    case 'Admin Jakarta':
    case 'Admin Makassar':
    case 'Warehouse Staff':

      return <Navigate to="/dashboard/warehouse" replace />;
    case 'Finance':
    case 'Finance Team':

      return <Navigate to="/dashboard/finance" replace />;
    default:

      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRoute;