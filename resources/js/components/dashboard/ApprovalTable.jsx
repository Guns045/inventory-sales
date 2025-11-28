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
import { Button } from "@/components/ui/button";
import { FileText, Inbox } from "lucide-react";
import { Link } from 'react-router-dom';

const ApprovalTable = ({ items = [] }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <Card className="h-full shadow-sm border-gray-100">
            <CardHeader className="flex flex-row items-center space-y-0 pb-4 border-b border-gray-100">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-gray-900" />
                    Pending Approvals
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-gray-100">
                            <TableHead className="text-gray-900 font-semibold">Quotation #</TableHead>
                            <TableHead className="text-gray-900 font-semibold">Customer</TableHead>
                            <TableHead className="text-gray-900 font-semibold">Amount</TableHead>
                            <TableHead className="text-gray-900 font-semibold">Date</TableHead>
                            <TableHead className="text-end text-gray-900 font-semibold">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map((item) => (
                                <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <TableCell>
                                        <Link to={`/quotations/${item.id}`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                            {item.quotation_number}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-gray-900">{item.customer?.company_name || 'Unknown'}</TableCell>
                                    <TableCell className="font-medium text-gray-900">{formatCurrency(item.total_amount)}</TableCell>
                                    <TableCell className="text-gray-600 text-xs">
                                        {new Date(item.created_at).toLocaleDateString('id-ID')}
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <Link to={`/quotations/${item.id}`}>
                                            <Button variant="outline" size="sm" className="h-8 border-gray-200 hover:bg-blue-50 hover:text-blue-600">
                                                Review
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <Inbox className="h-10 w-10 mb-3 text-gray-400" />
                                        <p className="font-bold text-gray-900 text-sm">No pending approvals</p>
                                        <p className="text-xs text-gray-500 mt-1">All quotations have been processed</p>
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

export default ApprovalTable;
