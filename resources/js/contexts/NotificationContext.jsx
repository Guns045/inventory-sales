import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAPI } from './APIContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { api } = useAPI();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    // Only fetch if user is authenticated
    if (!token) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications?.data || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [api, token]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!token) {
      return;
    }

    try {
      await api.put(`/notifications/${notificationId}/read`);

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [api, token]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      await api.put('/notifications/read-all');

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [api, token]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!token) {
      return;
    }

    try {
      await api.delete(`/notifications/${notificationId}`);

      const notification = notifications.find(n => n.id === notificationId);
      const wasUnread = notification?.is_read === false;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [api, notifications, token]);

  // Create custom notification (admin only)
  const createNotification = useCallback(async (notificationData) => {
    if (!token) {
      return;
    }

    try {
      const response = await api.post('/notifications/create', notificationData);

      // Refresh notifications to get the latest
      await fetchNotifications();

      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, [api, fetchNotifications, token]);

  // Auto-refresh notifications every 30 seconds, but only when authenticated
  useEffect(() => {
    if (!token) {
      return;
    }

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, token]);

  // Listen for custom notification events (for real-time updates)
  useEffect(() => {
    const handleNewNotification = (event) => {
      const newNotification = event.detail;

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, []);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};