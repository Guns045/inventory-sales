import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ProductCombobox component for searchable product selection
 * @param {Array} products - List of products
 * @param {string|number} value - Selected product ID
 * @param {Function} onChange - Handler for value change
 * @param {string} placeholder - Placeholder text
 */
export function ProductCombobox({
    products = [],
    value,
    onChange,
    onSearch,
    placeholder = "Search product by name or SKU..."
}) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    // Debounce search
    useEffect(() => {
        if (!onSearch) return;

        const timer = setTimeout(async () => {
            if (searchTerm) {
                setLoading(true);
                await onSearch(searchTerm);
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, onSearch]);

    useEffect(() => {
        if (value) {
            const product = products.find(p => p.id.toString() === value?.toString());
            if (product) {
                setSelectedProduct(product);
                // Only set search term if it's not already set (to avoid overwriting user typing)
                if (!searchTerm) {
                    setSearchTerm(`${product.name} (${product.sku})`);
                }
            }
        } else {
            setSelectedProduct(null);
            setSearchTerm("");
        }
    }, [value, products]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredProducts = onSearch ? products : products.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        return (
            product.name.toLowerCase().includes(searchLower) ||
            (product.sku && product.sku.toLowerCase().includes(searchLower))
        );
    });

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setOpen(true);

        // If user clears input, clear selection
        if (val === '') {
            onChange(null);
        }
    };

    const handleSelect = (product) => {
        onChange(product.id.toString());
        setSearchTerm(`${product.name} (${product.sku})`);
        setOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <Input
                placeholder={placeholder}
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => setOpen(true)}
                className="w-full"
            />

            {loading && (
                <div className="absolute right-3 top-2.5">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}

            {open && (searchTerm.length > 0 || filteredProducts.length > 0) && (
                <div className="absolute z-50 mt-1 max-h-96 min-w-[400px] w-auto overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    <div className="p-1">
                        {loading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="py-6 text-center text-sm">No product found.</div>
                        ) : (
                            filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        value?.toString() === product.id.toString() && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => handleSelect(product)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value?.toString() === product.id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{product.name}</span>
                                        {product.sku && (
                                            <span className="text-xs text-muted-foreground">{product.sku}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
