import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAPI } from './APIContext';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState({
    user: null,
    permissions: {},
    menuItems: [],
    menu_items: []
  });
  const [loading, setLoading] = useState(true);
  const { api } = useAPI();

  const clearPermissions = () => {
    setUserPermissions({
      user: null,
      permissions: {},
      menuItems: [],
      menu_items: []
    });
    setLoading(false);
  };

  const fetchUserPermissions = async () => {
    try {
      const response = await api.get('/user/permissions');
      setUserPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      clearPermissions();
    } finally {
      setLoading(false);
    }
  };

  // Fetch permissions when component mounts and token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && token.length > 10) {
      fetchUserPermissions();
    } else {
      clearPermissions();
    }
  }, []); // Only run once on mount

  const hasPermission = (permission) => {
    if (!permission || !userPermissions.permissions || typeof userPermissions.permissions !== 'object') {
      return false;
    }
    const [resource, action] = permission.split('.');
    return userPermissions.permissions[resource]?.includes(action) || false;
  };

  const canRead = (resource) => hasPermission(`${resource}.read`);
  const canCreate = (resource) => hasPermission(`${resource}.create`);
  const canUpdate = (resource) => hasPermission(`${resource}.update`);
  const canDelete = (resource) => hasPermission(`${resource}.delete`);

  const canApprove = () => hasPermission('approvals.approve');
  const canReject = () => hasPermission('approvals.reject');

  const getVisibleMenuItems = () => {
    if (!userPermissions.menu_items || !Array.isArray(userPermissions.menu_items)) {
      return [];
    }
    return userPermissions.menu_items.filter(item => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  };

  const value = {
    user: userPermissions.user,
    permissions: userPermissions.permissions,
    menuItems: userPermissions.menu_items,
    menu_items: userPermissions.menu_items,
    visibleMenuItems: getVisibleMenuItems(),
    loading,
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canApprove,
    canReject,
    refreshPermissions: fetchUserPermissions,
    clearPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};