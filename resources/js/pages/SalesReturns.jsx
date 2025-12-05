import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SalesReturnTable } from '@/components/transactions/SalesReturnTable';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

const SalesReturns = () => {
    const { get } = useAPI();
    const navigate = useNavigate();
    const { showError } = useToast();

    const [salesReturns, setSalesReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSalesReturns();
    }, []);

    const fetchSalesReturns = async () => {
        try {
            setLoading(true);
            const response = await get('/sales-returns');
            if (response && response.data) {
                setSalesReturns(response.data.data || response.data || []);
            }
        } catch (err) {
            console.error('Error fetching sales returns:', err);
            showError('Failed to fetch sales returns');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        navigate('/sales-returns/create');
    };

    const handleView = (returnOrder) => {
        navigate(`/sales-returns/${returnOrder.id}`);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Sales Returns"
                description="Manage customer returns and refunds"
                onAdd={handleCreate}
                addButtonText="Create Return"
            />

            <div className="bg-white rounded-lg border shadow-sm">
                <SalesReturnTable
                    data={salesReturns}
                    loading={loading}
                    onView={handleView}
                />
            </div>
        </div>
    );
};

export default SalesReturns;
