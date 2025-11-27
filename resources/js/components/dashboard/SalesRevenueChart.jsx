import React from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

/**
 * SalesRevenueChart Component
 * Displays sales vs revenue comparison chart
 */
const SalesRevenueChart = ({ data, type = 'line' }) => {
    // Chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
                },
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
                },
            },
            y: {
                grid: {
                    color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    drawBorder: false,
                },
                ticks: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
                    callback: function (value) {
                        if (value >= 1000) {
                            return 'Rp ' + (value / 1000).toFixed(0) + 'k';
                        }
                        return 'Rp ' + value;
                    },
                },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
                },
            },
        },
    };

    // Default mock data if none provided
    const chartData = data || {
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
    };

    return (
        <Card className="h-full flex flex-col" header="Sales vs Revenue" noPadding bodyClassName="flex-1 min-h-0 relative">
            <div className="absolute inset-0 p-6">
                <div className="h-full w-full">
                    {type === 'line' ? (
                        <Line options={options} data={chartData} />
                    ) : (
                        <Bar options={options} data={chartData} />
                    )}
                </div>
            </div>
        </Card>
    );
};

SalesRevenueChart.propTypes = {
    data: PropTypes.object,
    type: PropTypes.oneOf(['line', 'bar']),
};

export default SalesRevenueChart;
