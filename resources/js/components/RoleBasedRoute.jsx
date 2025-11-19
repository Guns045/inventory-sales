import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRoute = ({ children }) => {
  const { user } = useAuth();

  console.log('RoleBasedRoute - user:', user);
  console.log('RoleBasedRoute - user.role?.name:', user?.role?.name);

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  switch (user?.role?.name) {
    case 'Super Admin':
    case 'Admin':
      console.log('Redirecting to /dashboard (Admin)');
      return <Navigate to="/dashboard" replace />;
    case 'Sales':
    case 'Sales Team':
      console.log('Redirecting to /dashboard/sales');
      return <Navigate to="/dashboard/sales" replace />;
    case 'Manager Jakarta':
    case 'Manager Makassar':
    case 'Admin Jakarta':
    case 'Admin Makassar':
    case 'Warehouse Staff':
      console.log('Redirecting to /dashboard/warehouse');
      return <Navigate to="/dashboard/warehouse" replace />;
    case 'Finance':
    case 'Finance Team':
      console.log('Redirecting to /dashboard/finance');
      return <Navigate to="/dashboard/finance" replace />;
    default:
      console.log('Redirecting to /dashboard (default)');
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRoute;