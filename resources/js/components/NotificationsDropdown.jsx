import React, { useState, useRef } from 'react';
import { Dropdown, Badge, Button, Spinner, Alert, Nav, NavDropdown } from 'react-bootstrap';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationsDropdown = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [show, setShow] = useState(false);
  const dropdownRef = useRef(null);

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'info': 'bi-info-circle text-info',
      'success': 'bi-check-circle text-success',
      'warning': 'bi-exclamation-triangle text-warning',
      'danger': 'bi-x-circle text-danger',
    };
    return icons[type] || 'bi-bell text-muted';
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to link if available
    if (notification.link_url) {
      window.location.href = notification.link_url;
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const visibleNotifications = notifications.slice(0, 10);

  return (
    <Nav>
      <NavDropdown
        ref={dropdownRef}
        title={
          <div className="position-relative d-inline-block">
            <i className="bi bi-bell"></i>
            {unreadCount > 0 && (
              <Badge
                bg="danger"
                className="position-absolute top-0 start-100 translate-middle rounded-pill"
                style={{ fontSize: '0.6em', padding: '2px 5px' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        }
        id="notifications-dropdown"
        align="end"
        show={show}
        onToggle={(isOpen) => setShow(isOpen)}
        drop="down"
      >
        <Dropdown.Header className="d-flex justify-content-between align-items-center">
          <strong>Notifications</strong>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-primary"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </Dropdown.Header>

        <Dropdown.Divider />

        {isLoading ? (
          <div className="text-center p-4">
            <Spinner animation="border" size="sm" />
            <p className="mb-0 mt-2 small text-muted">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-4">
            <i className="bi bi-bell-slash text-muted" style={{ fontSize: '2rem' }}></i>
            <p className="mb-0 mt-2 text-muted">No notifications yet</p>
          </div>
        ) : (
          <>
            {visibleNotifications.map((notification) => (
              <Dropdown.Item
                key={notification.id}
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  backgroundColor: !notification.is_read ? '#f8f9fa' : 'transparent',
                  borderLeft: !notification.is_read ? '3px solid #0d6efd' : 'none',
                  padding: '12px 16px',
                }}
              >
                <div className="d-flex align-items-start">
                  <div className="me-3">
                    <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <p className="mb-1 small" style={{ lineHeight: '1.4' }}>
                          {notification.message}
                        </p>
                        <small className="text-muted">
                          {formatDateTime(notification.created_at)}
                        </small>
                      </div>
                      <div className="ms-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <i className="bi bi-x small"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Dropdown.Item>
            ))}

            {notifications.length > 10 && (
              <>
                <Dropdown.Divider />
                <Dropdown.Item
                  as="div"
                  className="text-center"
                  style={{ padding: '8px 16px' }}
                >
                  <small className="text-muted">
                    Showing 10 of {notifications.length} notifications
                  </small>
                </Dropdown.Item>
              </>
            )}

            <Dropdown.Divider />
            <Dropdown.Item
              as="div"
              className="text-center"
              style={{ padding: '8px 16px' }}
            >
              <Button
                variant="link"
                size="sm"
                className="p-0"
                href="/notifications"
              >
                View all notifications
              </Button>
            </Dropdown.Item>
          </>
        )}
      </NavDropdown>
    </Nav>
  );
};

export default NotificationsDropdown;