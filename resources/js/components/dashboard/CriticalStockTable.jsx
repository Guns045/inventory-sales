import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";

const CriticalStockTable = ({ items = [] }) => {
    return (
        <Card className="h-full shadow-sm border-gray-100">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4 border-b border-gray-100">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-gray-900" />
                    Critical Stock
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-gray-100">
                            <TableHead className="text-gray-900 font-semibold">Product</TableHead>
                            <TableHead className="text-gray-900 font-semibold">SKU</TableHead>
                            <TableHead className="text-center text-gray-900 font-semibold">Stock</TableHead>
                            <TableHead className="text-center text-gray-900 font-semibold">Min</TableHead>
                            <TableHead className="text-center text-gray-900 font-semibold">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map((item) => (
                                <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <TableCell className="font-medium text-gray-900">{item.product_name}</TableCell>
                                    <TableCell className="text-gray-600 text-xs">{item.sku}</TableCell>
                                    <TableCell className="text-center font-bold text-red-600">
                                        {item.quantity}
                                    </TableCell>
                                    <TableCell className="text-center text-gray-600">
                                        {item.min_stock_level}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="destructive" className="rounded-full px-3">Critical</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <Package className="h-10 w-10 mb-3 text-gray-400" />
                                        <p className="font-bold text-gray-900 text-sm">No critical stock items</p>
                                        <p className="text-xs text-gray-500 mt-1">Inventory levels are healthy</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default CriticalStockTable;
