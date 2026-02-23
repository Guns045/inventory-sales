import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const StockHistory = ({ productStockId }) => {
    const { api } = useAPI();
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        if (productStockId) {
            fetchHistory(1);
        }
    }, [productStockId]);

    const fetchHistory = async (currentPage) => {
        setLoading(true);
        try {
            const response = await api.get(`/product-stock/${productStockId}/movements?page=${currentPage}`);
            const newData = response.data.data;
            if (currentPage === 1) {
                setMovements(newData);
            } else {
                setMovements(prev => [...prev, ...newData]);
            }

            setHasMore(response.data.current_page < response.data.last_page);
            setPage(currentPage);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchHistory(page + 1);
        }
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
        <div className="space-y-4">
            <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[140px]">Date</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>User</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {movements.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No movements recorded.
                                </TableCell>
                            </TableRow>
                        ) : (
                            movements.map((movement) => (
                                <TableRow key={movement.id}>
                                    <TableCell className="text-xs">
                                        {format(new Date(movement.created_at), 'dd MMM yyyy HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("flex w-fit items-center gap-1 text-[10px] px-1.5 py-0.5", getMovementColor(movement.type))}>
                                            {getMovementIcon(movement.type)}
                                            <span className="uppercase">{movement.type}</span>
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <div className="font-mono">{movement.reference_number || '-'}</div>
                                        {movement.reference_type && (
                                            <div className="text-[10px] text-muted-foreground">
                                                {movement.reference_type.split('\\').pop()}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className={cn("text-right font-medium text-xs", movement.quantity_change > 0 ? "text-green-600" : "text-red-600")}>
                                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                        {movement.new_quantity}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {movement.user?.name || 'System'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {hasMore && !loading && (
                <div className="text-center pt-2">
                    <button
                        onClick={loadMore}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Load More Records
                    </button>
                </div>
            )}
        </div>
    );
};

export default StockHistory;
