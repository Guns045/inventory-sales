import React, { useState, useEffect } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Filter, Search, X, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const QuotationFilter = ({
    onFilter,
    onReset,
    warehouses = [],
    customers = [],
    initialFilters = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        warehouseId: 'all',
        customerId: 'all',
        status: 'all',
        search: '',
        ...initialFilters
    });

    const [localFilters, setLocalFilters] = useState(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleResetSection = (key, defaultValue = 'all') => {
        setLocalFilters(prev => ({ ...prev, [key]: defaultValue }));
    };

    const handleResetSectionDate = () => {
        setLocalFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
    };

    const handleResetAll = () => {
        const resetValues = {
            startDate: '',
            endDate: '',
            warehouseId: 'all',
            customerId: 'all',
            status: 'all',
            search: '',
        };
        setLocalFilters(resetValues);
        setFilters(resetValues);
        onReset && onReset();
        setIsOpen(false);
    };

    const handleApply = () => {
        setFilters(localFilters);
        onFilter && onFilter(localFilters);
        setIsOpen(false);
    };

    const hasActiveFilters =
        filters.startDate ||
        filters.endDate ||
        filters.warehouseId !== 'all' ||
        filters.customerId !== 'all' ||
        filters.status !== 'all' ||
        filters.search;

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={`gap-2 h-10 ${hasActiveFilters ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : ''}`}
                >
                    <Filter className="h-4 w-4" />
                    Filter
                    {hasActiveFilters && (
                        <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full">
                            !
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[360px] p-0 overflow-hidden shadow-xl border-slate-200" align="end">
                <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
                    <h3 className="font-semibold text-slate-900">Filter</h3>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Date Range */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date range</Label>
                            <button
                                className="text-xs text-indigo-600 font-medium hover:underline"
                                onClick={handleResetSectionDate}
                            >
                                Reset
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="from" className="text-[10px] text-slate-400">From:</Label>
                                <Input
                                    id="from"
                                    type="date"
                                    className="h-9 text-sm"
                                    value={localFilters.startDate}
                                    onChange={(e) => setLocalFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="to" className="text-[10px] text-slate-400">To:</Label>
                                <Input
                                    id="to"
                                    type="date"
                                    className="h-9 text-sm"
                                    value={localFilters.endDate}
                                    onChange={(e) => setLocalFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Warehouse */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Warehouse</Label>
                            <button
                                className="text-xs text-indigo-600 font-medium hover:underline"
                                onClick={() => handleResetSection('warehouseId')}
                            >
                                Reset
                            </button>
                        </div>
                        <Select
                            value={localFilters.warehouseId}
                            onValueChange={(val) => setLocalFilters(prev => ({ ...prev, warehouseId: val }))}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="All warehouses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All warehouses</SelectItem>
                                {warehouses.map(w => (
                                    <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Status */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
                            <button
                                className="text-xs text-indigo-600 font-medium hover:underline"
                                onClick={() => handleResetSection('status')}
                            >
                                Reset
                            </button>
                        </div>
                        <Select
                            value={localFilters.status}
                            onValueChange={(val) => setLocalFilters(prev => ({ ...prev, status: val }))}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                                <SelectItem value="CONVERTED">Converted</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Customer */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer</Label>
                            <button
                                className="text-xs text-indigo-600 font-medium hover:underline"
                                onClick={() => handleResetSection('customerId')}
                            >
                                Reset
                            </button>
                        </div>
                        <Select
                            value={localFilters.customerId}
                            onValueChange={(val) => setLocalFilters(prev => ({ ...prev, customerId: val }))}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="All customers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All customers</SelectItem>
                                {customers.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.company_name || c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Keyword search */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Keyword search</Label>
                            <button
                                className="text-xs text-indigo-600 font-medium hover:underline"
                                onClick={() => handleResetSection('search', '')}
                            >
                                Reset
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                className="pl-9 h-10"
                                placeholder="Search..."
                                value={localFilters.search}
                                onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t flex items-center justify-between gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-slate-200"
                        onClick={handleResetAll}
                    >
                        Reset all
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                        onClick={handleApply}
                    >
                        Apply now
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
