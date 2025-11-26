import { useState, useEffect, useCallback, useRef } from 'react';
import { useAPI } from '@/contexts/APIContext';

/**
 * Custom hook for debounced search with auto-suggestions
 * @param {string} endpoint - Search endpoint (optional)
 * @param {object} options - Configuration options
 * @returns {object} Search state and methods
 */
export function useSearch(endpoint = null, options = {}) {
    const { api } = useAPI();
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const debounceTimeout = useRef(null);

    const debounceMs = options.debounce || 300;
    const minChars = options.minChars || 2;

    // Debounced search function
    const performSearch = useCallback(async (query) => {
        if (!endpoint || query.length < minChars) {
            setSuggestions([]);
            return;
        }

        try {
            setSearching(true);
            const response = await api.get(`${endpoint}?q=${encodeURIComponent(query)}&limit=${options.limit || 10}`);
            setSuggestions(response.data.data || response.data || []);
        } catch (err) {
            console.error('Search error:', err);
            setSuggestions([]);
        } finally {
            setSearching(false);
        }
    }, [api, endpoint, minChars, options.limit]);

    // Handle search term change with debouncing
    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);

        // Clear existing timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // Set new timeout for debouncing
        if (endpoint && value.length >= minChars) {
            debounceTimeout.current = setTimeout(() => {
                performSearch(value);
            }, debounceMs);
        } else {
            setSuggestions([]);
        }
    }, [performSearch, debounceMs, minChars, endpoint]);

    // Clear search
    const clearSearch = useCallback(() => {
        setSearchTerm('');
        setSuggestions([]);
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    return {
        searchTerm,
        setSearchTerm: handleSearchChange,
        suggestions,
        searching,
        clearSearch
    };
}
