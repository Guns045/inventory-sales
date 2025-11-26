import { useState, useCallback } from 'react';

/**
 * Custom hook for modal state management
 * @param {boolean} initialState - Initial open state
 * @returns {object} Modal state and controls
 */
export function useModal(initialState = false) {
    const [isOpen, setIsOpen] = useState(initialState);

    const open = useCallback(() => {
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    const toggle = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    return {
        isOpen,
        open,
        close,
        toggle,
        setIsOpen
    };
}
