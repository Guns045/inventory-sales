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
    placeholder = "Select product..."
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
            // Try to find in current list, or maybe we need a way to fetch the selected product details if not in list
            const product = products.find(p => p.id.toString() === value?.toString());
            if (product) {
                setSelectedProduct(product);
            }
        } else {
            setSelectedProduct(null);
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

    // If onSearch is provided, we assume 'products' is the search result
    // Otherwise, we filter locally
    const filteredProducts = onSearch ? products : products.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        return (
            product.name.toLowerCase().includes(searchLower) ||
            (product.sku && product.sku.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                    !selectedProduct && "text-muted-foreground"
                )}
                onClick={() => setOpen(!open)}
            >
                <span className="truncate">
                    {selectedProduct
                        ? `${selectedProduct.sku ? selectedProduct.sku + ' - ' : ''}${selectedProduct.name}`
                        : placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </div>

            {open && (
                <div className="absolute z-50 mt-1 max-h-96 min-w-[400px] w-auto overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    <div className="flex items-center border-b px-3" onClick={(e) => e.stopPropagation()}>
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search by name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
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
                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        value?.toString() === product.id.toString() && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => {
                                        onChange(product.id.toString());
                                        setOpen(false);
                                        setSearchTerm("");
                                        // If using async search, we might want to keep the selected product in the list or handle it
                                        setSelectedProduct(product);
                                    }}
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
