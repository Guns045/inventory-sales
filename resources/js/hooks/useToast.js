import { useCallback } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

/**
 * Custom hook for toast notifications
 * @returns {object} Toast notification methods
 */
export function useToast() {
    const { addNotification } = useNotifications();

    const showSuccess = useCallback((message, title = 'Success') => {
        addNotification({
            type: 'success',
            title,
            message
        });
    }, [addNotification]);

    const showError = useCallback((message, title = 'Error') => {
        addNotification({
            type: 'error',
            title,
            message
        });
    }, [addNotification]);

    const showInfo = useCallback((message, title = 'Info') => {
        addNotification({
            type: 'info',
            title,
            message
        });
    }, [addNotification]);

    const showWarning = useCallback((message, title = 'Warning') => {
        addNotification({
            type: 'warning',
            title,
            message
        });
    }, [addNotification]);

    return {
        showSuccess,
        showError,
        showInfo,
        showWarning
    };
}
