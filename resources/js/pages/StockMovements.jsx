import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRightLeft,
    RefreshCw,
    Download
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


import Pagination from '@/components/common/Pagination';

const StockMovements = () => {
    const { api } = useAPI();
    const { user } = useAuth();
    const { formatCurrency } = useCompany();
    const { toast } = useToast();

    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined,
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [total, setTotal] = useState(0);
    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        fetchMovements();
    }, [currentPage, selectedWarehouse, selectedType, dateRange]);

    const fetchWarehouses = async () => {
        try {
            const response = await api.get('/warehouses');
            if (Array.isArray(response.data)) {
                setWarehouses(response.data);
            } else if (response.data.data) {
                setWarehouses(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        }
    };

    const fetchMovements = async (page = currentPage, currentPerPage = perPage) => {
        setLoading(true);
        try {
            const params = {
                page: page,
                per_page: currentPerPage,
                search: searchTerm,
                warehouse_id: selectedWarehouse !== 'all' ? selectedWarehouse : undefined,
                type: selectedType !== 'all' ? selectedType : undefined,
                start_date: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
                end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
            };

            const response = await api.get('/stock-movements', { params });
            setMovements(response.data.data || []);
            setTotalPages(response.data.last_page || 1);
            setTotal(response.data.total || 0);
            setFrom(response.data.from || 0);
            setTo(response.data.to || 0);
        } catch (error) {
            console.error('Error fetching movements:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch stock movements.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage);
        setCurrentPage(1);
        fetchMovements(1, newPerPage);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchMovements();
    };

    const getMovementIcon = (type) => {
        switch (type) {
            case 'in':
                return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
            case 'out':
                return <ArrowUpRight className="h-4 w-4 text-red-600" />;
            case 'adjustment':
                return <ArrowRightLeft className="h-4 w-4 text-orange-600" />;
            default:
                return <RefreshCw className="h-4 w-4 text-gray-600" />;
        }
    };

    const getMovementColor = (type) => {
        switch (type) {
            case 'in':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'out':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'adjustment':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock Movements</h1>
                    <p className="text-muted-foreground">Audit trail of all inventory changes.</p>
                </div>

                {/* <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button> */}
            </div>

            <Card className="border-indigo-100 shadow-md">
                <CardHeader className="bg-slate-50 border-b pb-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-80">
                                <div className="relative w-full">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search product, ref number..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <Button type="submit">Search</Button>
                            </form>

                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <SelectValue placeholder="Filter by Warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Warehouses</SelectItem>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="w-full md:w-[150px]">
                                    <SelectValue placeholder="Filter by Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="in">Inbound (In)</SelectItem>
                                    <SelectItem value="out">Outbound (Out)</SelectItem>
                                    <SelectItem value="adjustment">Adjustment</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : undefined }))}
                                    className="w-[150px]"
                                />
                                <span className="text-muted-foreground">-</span>
                                <Input
                                    type="date"
                                    value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : undefined }))}
                                    className="w-[150px]"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Ref #</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>To/From</TableHead>
                                <TableHead>Warehouse</TableHead>
                                <TableHead className="text-right">Qty Change</TableHead>
                                <TableHead>User</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No stock movements found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movements.map((movement) => (
                                    <TableRow key={movement.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(movement.created_at), 'dd MMM yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("flex w-fit items-center gap-1", getMovementColor(movement.type))}>
                                                {getMovementIcon(movement.type)}
                                                <span className="uppercase text-xs">{movement.type}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">{movement.reference_number || '-'}</span>
                                            {movement.reference_type && (
                                                <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={movement.reference_type}>
                                                    {movement.reference_type.split('\\').pop()}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{movement.product?.name}</div>
                                            <div className="text-xs text-muted-foreground">{movement.product?.sku}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {movement.related_party !== '-' && (
                                                    movement.type === 'in' ? <ArrowDownLeft className="h-3 w-3 text-green-500" /> : <ArrowUpRight className="h-3 w-3 text-red-500" />
                                                )}
                                                <span className="text-sm">{movement.related_party}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{movement.warehouse?.name}</TableCell>
                                        <TableCell className={cn("text-right font-bold", movement.quantity_change > 0 ? "text-green-600" : "text-red-600")}>
                                            {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                                    {movement.user?.name?.charAt(0) || 'S'}
                                                </div>
                                                <span className="text-sm text-muted-foreground">{movement.user?.name || 'System'}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {total > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            from={from}
                            to={to}
                            total={total}
                            perPage={perPage}
                            onPerPageChange={handlePerPageChange}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StockMovements;
