import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing line items in transactions
 * @param {Array} initialItems - Initial line items
 * @returns {Object} Line items state and handlers
 */
export function useLineItems(initialItems = []) {
    const [items, setItems] = useState(initialItems);

    const addItem = useCallback(() => {
        setItems([...items, {
            product_id: '',
            quantity: 1,
            unit_price: 0,
            discount_percentage: 0,
            tax_rate: 0
        }]);
    }, [items]);

    const updateItem = useCallback((index, updatedItem) => {
        setItems(items.map((item, i) => i === index ? updatedItem : item));
    }, [items]);

    const removeItem = useCallback((index) => {
        setItems(items.filter((_, i) => i !== index));
    }, [items]);

    const clearItems = useCallback(() => {
        setItems([]);
    }, []);

    const calculateItemTotal = useCallback((item) => {
        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
        const discount = subtotal * ((item.discount_percentage || 0) / 100);
        const afterDiscount = subtotal - discount;
        const tax = afterDiscount * ((item.tax_rate || 0) / 100);
        return afterDiscount + tax;
    }, []);

    const totals = useMemo(() => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        items.forEach(item => {
            const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
            const itemDiscount = itemSubtotal * ((item.discount_percentage || 0) / 100);
            const afterDiscount = itemSubtotal - itemDiscount;
            const itemTax = afterDiscount * ((item.tax_rate || 0) / 100);

            subtotal += itemSubtotal;
            totalDiscount += itemDiscount;
            totalTax += itemTax;
        });

        const total = subtotal - totalDiscount + totalTax;

        return {
            subtotal,
            discount: totalDiscount,
            tax: totalTax,
            total
        };
    }, [items]);

    return {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
        clearItems,
        calculateItemTotal,
        totals
    };
}
