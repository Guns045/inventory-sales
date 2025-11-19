import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';

// For authentication-only protection
const AuthProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// For permission-based protection
const PermissionProtectedRoute = ({ children, permission, fallback = '/dashboard' }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
};

// Combined protected route (both auth and permission)
const ProtectedRoute = ({ children, permission, fallback = '/dashboard' }) => {
  const { isAuthenticated } = useAuth();

  // First check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Then check permission if specified
  if (permission) {
    return (
      <PermissionProtectedRoute permission={permission} fallback={fallback}>
        {children}
      </PermissionProtectedRoute>
    );
  }

  return children;
};

export { AuthProtectedRoute, PermissionProtectedRoute };
export default ProtectedRoute;