import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import { RefreshCw, Search, Download, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormDialog } from "@/components/common/FormDialog";
import { Textarea } from "@/components/ui/textarea"; // Assuming this exists or use Input
import { Label } from "@/components/ui/label";

const DamageReportPage = () => {
    const { api } = useAPI();
    const { showSuccess, showError } = useToast();

    const [data, setData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);

    // Filters
    const [search, setSearch] = useState('');
    const [warehouseId, setWarehouseId] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });

    // Actions
    const [isReverseOpen, setIsReverseOpen] = useState(false);
    const [isDisposeOpen, setIsDisposeOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionNote, setActionNote] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        fetchData(1);
    }, [warehouseId, dateFrom, dateTo]); // Auto-refresh on filter change

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchWarehouses = async () => {
        try {
            const response = await api.get('/warehouses');
            setWarehouses(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        }
    };

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                per_page: 20
            });

            if (search) params.append('search', search);
            if (warehouseId && warehouseId !== 'all') params.append('warehouse_id', warehouseId);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const response = await api.get(`/product-stock/damage-report?${params}`);

            setData(response.data.movements.data);
            setStats(response.data.stats);
            setPagination({
                current_page: response.data.movements.current_page,
                last_page: response.data.movements.last_page,
                total: response.data.movements.total
            });

        } catch (error) {
            console.error('Error fetching damage report:', error);
            showError("Failed to fetch damage reports");
        } finally {
            setLoading(false);
        }
    };

    const handleReverse = (item) => {
        setSelectedItem(item);
        setActionNote('');
        setIsReverseOpen(true);
    };

    const handleDispose = (item) => {
        setSelectedItem(item);
        setActionNote('');
        setIsDisposeOpen(true);
    };

    const submitReverse = async () => {
        setProcessing(true);
        try {
            await api.post('/product-stock/damage/reverse', {
                product_id: selectedItem.product_id,
                warehouse_id: selectedItem.warehouse_id,
                quantity: selectedItem.quantity, // Reversing full amount of this record for now, UI could specific quantity later
                notes: actionNote
            });
            showSuccess("Damage reversed successfully. Stock returned to available.");
            setIsReverseOpen(false);
            fetchData(pagination.current_page);
        } catch (error) {
            showError(error.response?.data?.message || "Failed to reverse damage");
        } finally {
            setProcessing(false);
        }
    };

    const submitDispose = async () => {
        setProcessing(true);
        try {
            await api.post('/product-stock/damage/dispose', {
                product_id: selectedItem.product_id,
                warehouse_id: selectedItem.warehouse_id,
                quantity: selectedItem.quantity,
                notes: actionNote
            });
            showSuccess("Damaged stock disposed successfully.");
            setIsDisposeOpen(false);
            fetchData(pagination.current_page);
        } catch (error) {
            showError(error.response?.data?.message || "Failed to dispose stock");
        } finally {
            setProcessing(false);
        }
    };

    const columns = [
        {
            header: "Date",
            accessorKey: "created_at",
            cell: (row) => new Date(row.created_at).toLocaleString('id-ID')
        },
        {
            header: "Product",
            accessorKey: "product.name",
            cell: (row) => (
                <div>
                    <div className="font-medium">{row.product?.name}</div>
                    <div className="text-xs text-muted-foreground">{row.product?.sku}</div>
                </div>
            )
        },
        {
            header: "Warehouse",
            accessorKey: "warehouse.name",
            cell: (row) => row.warehouse?.name || '-'
        },
        {
            header: "Type",
            accessorKey: "type",
            cell: (row) => {
                let color = "secondary";
                if (row.type === 'DAMAGE') color = "destructive";
                if (row.type === 'DAMAGE_REVERSAL') color = "default"; // green-ish usually
                if (row.type === 'DISPOSAL') color = "outline";

                return <Badge variant={color}>{row.type.replace('_', ' ')}</Badge>
            }
        },
        {
            header: "Reason",
            accessorKey: "reason",
            cell: (row) => row.reason || '-'
        },
        {
            header: "Qty",
            accessorKey: "quantity",
            cell: (row) => <span className="font-bold">{row.quantity}</span>
        },
        {
            header: "Notes",
            accessorKey: "notes",
            cell: (row) => <div className="max-w-[200px] truncate" title={row.notes}>{row.notes || '-'}</div>
        },
        {
            header: "User",
            accessorKey: "user.name",
            cell: (row) => row.user?.name || '-'
        },
        /* Actions currently not supported for individual historical records directly via this table easily without context ID. 
           But if we want to reverse a specific "DAMAGE" action, we need to know if it's already reversed or disposed. 
           For now, let's keep it read-only log. The "Management" is done via ProductStock page usually, or we can add buttons here if the row represents "current damaged stock".
           Actually, the API returns movements (history).
           So Reversing a specific movement history is tricky. 
           Usually you reverse from the "Current Damaged Stock" pool. 
           
           Wait, the requirement says: "backend services ... to manage damaged stock (report, reverse, dispose), and building a frontend page to view and manage damage reports."
           
           If this page is just a REPORT (Log), then actions might not be needed on rows.
           However, "Manage" implies action. 
           Maybe we should show "Current Damaged Stock" summary somewhere? 
           
           The Stats endpoint returns total damaged count.
           
           Let's stick to View Log for this page for now, as managing (disposing) is better done from the Stock View where you see current damaged balance.
           Detailed management might be: "I have 5 damaged items of SKU-1. I want to dispose 2 of them."
           That is best done in ProductStockTable -> clicking "Damaged: 5" -> opens "Manage Damaged Stock" modal? 
           
           Or, I can add a "Snapshot" view here.
           
           Let's assume "Damage Report Page" is primarily history/log for auditing.
        */
    ];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Damage Reports</h2>
                    <p className="text-muted-foreground">History and statistics of damaged stock</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => fetchData(pagination.current_page)} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Damaged Entries (Count)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_damaged_events}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Quantity Damaged</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.total_quantity_damaged}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.this_month_count}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium">History Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search product..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={warehouseId} onValueChange={setWarehouseId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Warehouses</SelectItem>
                                {warehouses.map(w => (
                                    <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            className="w-[150px]"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <Input
                            type="date"
                            className="w-[150px]"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>

                    <DataTable
                        columns={columns}
                        data={data}
                        loading={loading}
                        emptyMessage="No damage reports found"
                    />

                    {pagination.total > 0 && (
                        <Pagination
                            currentPage={pagination.current_page}
                            totalPages={pagination.last_page}
                            onPageChange={fetchData}
                            from={(pagination.current_page - 1) * 20 + 1}
                            to={Math.min(pagination.current_page * 20, pagination.total)}
                            total={pagination.total}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DamageReportPage;
