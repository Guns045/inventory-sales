import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for pagination logic
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page
 * @returns {object} Pagination state and controls
 */
export function usePagination(totalItems = 0, itemsPerPage = 20) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = useMemo(() => {
        return Math.ceil(totalItems / itemsPerPage) || 1;
    }, [totalItems, itemsPerPage]);

    const goToPage = useCallback((page) => {
        const pageNumber = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNumber);
    }, [totalPages]);

    const nextPage = useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const prevPage = useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    const goToFirstPage = useCallback(() => {
        goToPage(1);
    }, [goToPage]);

    const goToLastPage = useCallback(() => {
        goToPage(totalPages);
    }, [totalPages, goToPage]);

    const canGoNext = currentPage < totalPages;
    const canGoPrev = currentPage > 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return {
        currentPage,
        totalPages,
        goToPage,
        nextPage,
        prevPage,
        goToFirstPage,
        goToLastPage,
        canGoNext,
        canGoPrev,
        startIndex,
        endIndex,
        itemsPerPage
    };
}
