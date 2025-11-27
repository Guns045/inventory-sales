import React from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

/**
 * CriticalStockTable Component
 * Displays products with stock levels below minimum
 */
const CriticalStockTable = ({ products }) => {
    // Mock data if none provided
    const stockData = products || [
        { id: 1, name: 'Brake Pad Set', sku: 'BP-001', current: 5, min: 10, status: 'critical' },
        { id: 2, name: 'Oil Filter', sku: 'OF-202', current: 8, min: 20, status: 'critical' },
        { id: 3, name: 'Spark Plug', sku: 'SP-105', current: 12, min: 15, status: 'warning' },
        { id: 4, name: 'Air Filter', sku: 'AF-303', current: 3, min: 10, status: 'critical' },
        { id: 5, name: 'Timing Belt', sku: 'TB-404', current: 2, min: 5, status: 'critical' },
    ];

    return (
        <Card className="h-full" header="Critical Stock Alerts" noPadding>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Product
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Stock
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {stockData.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {product.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {product.sku}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 dark:text-white font-bold">
                                        {product.current} <span className="text-gray-400 font-normal">/ {product.min}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge variant={product.status === 'critical' ? 'danger' : 'warning'} size="sm">
                                        {product.status === 'critical' ? 'Critical' : 'Low Stock'}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-right">
                <a href="/inventory" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    View all inventory &rarr;
                </a>
            </div>
        </Card>
    );
};

CriticalStockTable.propTypes = {
    products: PropTypes.array,
};

export default CriticalStockTable;
