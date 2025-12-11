import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { useAPI } from '@/contexts/APIContext';
import { Loader2 } from "lucide-react";

/**
 * ProductForm component for creating/editing products
 * @param {object} formData - Form data
 * @param {Function} onChange - Change handler
 * @param {Function} onSubmit - Submit handler
 * @param {Array} categories - Categories list
 * @param {Array} suppliers - Suppliers list
 * @param {boolean} isEditing - Edit mode flag
 */
export function ProductForm({
    formData,
    onChange,
    onSubmit,
    categories = [],
    suppliers = [],
    isEditing = false
}) {
    const { api } = useAPI();
    const [suggestions, setSuggestions] = React.useState([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
    const wrapperRef = React.useRef(null);

    React.useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value })
    }

    const handlePartNumberChange = async (e) => {
        const value = e.target.value;
        handleChange('sku', value);

        if (value.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            setLoadingSuggestions(true);
            const response = await api.get(`/settings/raw-products/search?q=${value}`);
            setSuggestions(response.data.data);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Error searching raw products:', error);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        handleChange('sku', suggestion.part_number);
        handleChange('name', suggestion.description);
        // Also populate other fields if available and empty
        if (!formData.category_id && suggestion.category) {
            // Logic to find category ID by name would be needed here, 
            // but for now we just populate what we can directly map or leave it.
        }
        if (!formData.buy_price && suggestion.buy_price) {
            handleChange('buy_price', suggestion.buy_price);
        }
        if (!formData.sell_price && suggestion.sell_price) {
            handleChange('sell_price', suggestion.sell_price);
        }

        setShowSuggestions(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative" ref={wrapperRef}>
                    <Label htmlFor="sku">Part Number *</Label>
                    <div className="relative">
                        <Input
                            id="sku"
                            value={formData.sku || ''}
                            onChange={handlePartNumberChange}
                            placeholder="Enter Part Number"
                            required
                            autoComplete="off"
                        />
                        {loadingSuggestions && (
                            <div className="absolute right-3 top-2.5">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                            {suggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    <div className="font-medium">{suggestion.part_number}</div>
                                    <div className="text-xs text-gray-500 truncate">{suggestion.description}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Description *</Label>
                    <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Enter Description"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                        value={formData.category_id?.toString() || ''}
                        onValueChange={(value) => handleChange('category_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Select
                        value={formData.supplier_id?.toString() || ''}
                        onValueChange={(value) => handleChange('supplier_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                    {supplier.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="buy_price">Buy Price *</Label>
                    <Input
                        id="buy_price"
                        type="number"
                        value={formData.buy_price || ''}
                        onChange={(e) => handleChange('buy_price', e.target.value)}
                        placeholder="0"
                        required
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sell_price">Sell Price *</Label>
                    <Input
                        id="sell_price"
                        type="number"
                        value={formData.sell_price || ''}
                        onChange={(e) => handleChange('sell_price', e.target.value)}
                        placeholder="0"
                        required
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="min_stock_level">Min Stock Level</Label>
                    <Input
                        id="min_stock_level"
                        type="number"
                        value={formData.min_stock_level || ''}
                        onChange={(e) => handleChange('min_stock_level', e.target.value)}
                        placeholder="0"
                        min="0"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                        id="weight"
                        type="number"
                        value={formData.weight || ''}
                        onChange={(e) => handleChange('weight', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>
        </form>
    )
}
