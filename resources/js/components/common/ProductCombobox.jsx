import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
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
    initialProduct,
    onChange,
    onSearch,
    placeholder = "Search product by name or SKU..."
}) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
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
            const product = products.find(p => p.id.toString() === value?.toString())
                || (initialProduct?.id?.toString() === value?.toString() ? initialProduct : null);

            if (product) {
                setSelectedProduct(product);
                // Always update search term to match selected product
                setSearchTerm(`${product.sku} - ${product.name}`);
            }
        }
    }, [value, products, initialProduct]);

    useEffect(() => {
        if (!value) {
            setSelectedProduct(null);
            // Only clear search term if input is NOT focused (external reset)
            // If input is focused, user is typing, so don't clear
            const isFocused = wrapperRef.current?.contains(document.activeElement);
            if (!isFocused) {
                setSearchTerm("");
            }
        }
    }, [value]);

    // Update coords when opening
    useEffect(() => {
        if (open && wrapperRef.current) {
            const updatePosition = () => {
                const rect = wrapperRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            };

            updatePosition();
            window.addEventListener("resize", updatePosition);
            window.addEventListener("scroll", updatePosition, true);

            return () => {
                window.removeEventListener("resize", updatePosition);
                window.removeEventListener("scroll", updatePosition, true);
            };
        }
    }, [open]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                // Check if click is inside the portal
                const portal = document.getElementById("product-combobox-portal");
                if (portal && portal.contains(event.target)) {
                    return;
                }
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

        // If user types, clear selection to enter search mode
        if (value) {
            onChange(null);
        }
    };

    const handleSelect = (product) => {
        onChange(product.id.toString());
        setSearchTerm(`${product.sku} - ${product.name}`);
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

            {open && (searchTerm.length > 0 || filteredProducts.length > 0) && createPortal(
                <div
                    id="product-combobox-portal"
                    className="absolute z-[9999] mt-1 max-h-96 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        width: Math.max(coords.width, 400), // Min width 400px
                    }}
                >
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
                </div>,
                document.body
            )}
        </div>
    );
}
