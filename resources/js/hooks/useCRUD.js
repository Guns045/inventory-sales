import { useState, useEffect, useCallback } from 'react';
import { useAPI } from '@/contexts/APIContext';

/**
 * Custom hook for CRUD operations with built-in loading, error handling, and pagination
 * @param {string} endpoint - API endpoint (e.g., '/products')
 * @param {object} options - Configuration options
 * @returns {object} CRUD methods and state
 */
export function useCRUD(endpoint, options = {}) {
    const { api } = useAPI();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: options.perPage || 20,
        total: 0,
        from: 0,
        to: 0
    });

    // Fetch items with pagination and search
    const fetchItems = useCallback(async (page = 1, searchParams = {}) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = {
                page: page,
                per_page: pagination.per_page,
                ...searchParams
            };

            const params = new URLSearchParams();
            Object.keys(queryParams).forEach(key => {
                if (queryParams[key] !== undefined && queryParams[key] !== null && queryParams[key] !== '') {
                    params.append(key, queryParams[key]);
                }
            });

            const response = await api.get(`${endpoint}?${params}`);

            // Handle both paginated and non-paginated responses
            if (response.data.data) {
                setItems(response.data.data);

                // Check for Resource Collection structure (meta) or Standard Pagination
                const meta = response.data.meta || response.data;

                setPagination({
                    current_page: meta.current_page || 1,
                    last_page: meta.last_page || 1,
                    per_page: meta.per_page || pagination.per_page,
                    total: meta.total || 0,
                    from: meta.from || 0,
                    to: meta.to || 0
                });
            } else {
                setItems(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch items');
            console.error('Error fetching items:', err);
        } finally {
            setLoading(false);
        }
    }, [api, endpoint, pagination.per_page]);

    // Create new item
    const create = useCallback(async (data, refetchParams = {}) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.post(endpoint, data);
            await fetchItems(pagination.current_page, refetchParams);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to create item';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [api, endpoint, fetchItems, pagination.current_page]);

    // Update existing item
    const update = useCallback(async (id, data, refetchParams = {}) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.put(`${endpoint}/${id}`, data);
            await fetchItems(pagination.current_page, refetchParams);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to update item';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [api, endpoint, fetchItems, pagination.current_page]);

    // Delete item
    const remove = useCallback(async (id, refetchParams = {}) => {
        try {
            setLoading(true);
            setError(null);
            await api.delete(`${endpoint}/${id}`);
            await fetchItems(pagination.current_page, refetchParams);
            return { success: true };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to delete item';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [api, endpoint, fetchItems, pagination.current_page]);

    // Get single item by ID
    const getById = useCallback(async (id) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`${endpoint}/${id}`);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to fetch item';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [api, endpoint]);

    // Set page
    const setPage = useCallback((page) => {
        fetchItems(page);
    }, [fetchItems]);

    // Initial fetch
    useEffect(() => {
        if (options.autoFetch !== false) {
            fetchItems();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        items,
        loading,
        error,
        pagination,
        fetchItems,
        create,
        update,
        remove,
        getById,
        setPage,
        refresh: (params = {}) => fetchItems(pagination.current_page, params)
    };
}
