import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  const [fetching, setFetching] = useState(false);
  const { api } = useAPI();

  useEffect(() => {
    // Only fetch if not already fetching and not logged in and has a valid token
    const token = localStorage.getItem('token');
    if (!fetching && !userPermissions.user && token && token.length > 10) {
      fetchUserPermissions();
    }
  }, []); // Empty dependency array is correct

  const fetchUserPermissions = async () => {
    if (fetching) {
      console.log('PermissionContext: Already fetching permissions, skipping...');
      return;
    }

    console.log('PermissionContext: Starting to fetch permissions...');
    setFetching(true);
    setLoading(true);

    try {
      const response = await api.get('/user/permissions');
      console.log('PermissionContext: Successfully fetched permissions:', response.data);
      setUserPermissions(response.data);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      // If 401 error, clear auth data and redirect
      if (error.response?.status === 401) {
        console.log('PermissionContext: 401 error, clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
      setFetching(false);
      console.log('PermissionContext: Fetch completed');
    }
  };

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
    refreshPermissions: fetchUserPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};