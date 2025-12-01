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
    placeholder = "Select product..."
}) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (value) {
            const product = products.find(p => p.id.toString() === value?.toString());
            setSelectedProduct(product || null);
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

    const filteredProducts = products.filter(product => {
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
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
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
                        {filteredProducts.length === 0 ? (
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
