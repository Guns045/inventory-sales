import { useState, useEffect } from 'react';
import api from '../utils/api';

/**
 * Custom hook for fetching dashboard data
 * @returns {object} Dashboard data and loading state
 */
const useDashboardData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // In a real app, this would be an API call
            // const response = await api.get('/dashboard/stats');
            // setData(response.data);

            // Simulating API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data
            setData({
                stats: {
                    revenue: { value: 1250000000, trend: '+12.5%', direction: 'up' },
                    sales: { value: 1245, trend: '+5.2%', direction: 'up' },
                    approvals: { value: 8, trend: '3 urgent', direction: 'neutral' },
                },
                chartData: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [
                        {
                            label: 'Revenue',
                            data: [12000000, 19000000, 15000000, 25000000, 22000000, 30000000, 28000000],
                            borderColor: '#4f46e5', // Indigo 600
                            backgroundColor: '#4f46e5', // Indigo 600 (Solid)
                            tension: 0.4,
                            yAxisID: 'y',
                        },
                        {
                            label: 'Sales Count',
                            data: [12, 19, 15, 25, 22, 30, 28],
                            borderColor: '#a5b4fc', // Indigo 300
                            backgroundColor: '#a5b4fc', // Indigo 300 (Solid)
                            tension: 0.4,
                            yAxisID: 'y1',
                        },
                    ],
                },
                activities: [
                    {
                        id: 1,
                        user: 'Admin User',
                        action: 'Created new product',
                        target: 'Hydraulic Pump X-200',
                        time: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
                        type: 'success',
                    },
                    {
                        id: 2,
                        user: 'Sales Manager',
                        action: 'Approved quotation',
                        target: 'QT-2025-001',
                        time: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
                        type: 'info',
                    },
                    {
                        id: 3,
                        user: 'Warehouse Staff',
                        action: 'Updated stock',
                        target: 'Filter Oil 5L',
                        time: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
                        type: 'warning',
                    },
                    {
                        id: 4,
                        user: 'System',
                        action: 'Low stock alert',
                        target: 'Brake Pad Set',
                        time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                        type: 'danger',
                    },
                    {
                        id: 5,
                        user: 'Finance',
                        action: 'Generated invoice',
                        target: 'INV-2025-042',
                        time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
                        type: 'neutral',
                    },
                ],
                criticalStock: [
                    { id: 1, name: 'Brake Pad Set', sku: 'BP-001', current: 5, min: 10, status: 'critical' },
                    { id: 2, name: 'Oil Filter', sku: 'OF-202', current: 8, min: 20, status: 'critical' },
                    { id: 3, name: 'Spark Plug', sku: 'SP-105', current: 12, min: 15, status: 'warning' },
                    { id: 4, name: 'Air Filter', sku: 'AF-303', current: 3, min: 10, status: 'critical' },
                    { id: 5, name: 'Timing Belt', sku: 'TB-404', current: 2, min: 5, status: 'critical' },
                ],
                approvals: [
                    { id: 1, number: 'QT-2025-001', customer: 'PT Maju Jaya', amount: 15000000, date: '2025-11-28' },
                    { id: 2, number: 'QT-2025-002', customer: 'CV Berkah Abadi', amount: 8500000, date: '2025-11-27' },
                    { id: 3, number: 'QT-2025-003', customer: 'PT Sinar Harapan', amount: 42000000, date: '2025-11-27' },
                    { id: 4, number: 'QT-2025-004', customer: 'Bengkel Pak Budi', amount: 2100000, date: '2025-11-26' },
                ],
            });
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch dashboard data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        // Set up polling for real-time updates (every 30 seconds)
        const intervalId = setInterval(() => {
            // In a real app, you might want to only fetch updates or use WebSockets
            // fetchDashboardData(); 
            console.log('Polling for dashboard updates...');
        }, 30000);

        return () => clearInterval(intervalId);
    }, []);

    const refreshData = () => {
        fetchDashboardData();
    };

    return { data, loading, error, refreshData };
};

export default useDashboardData;
