import React from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

/**
 * ActivityLog Component
 * Displays a real-time feed of system activities
 */
const ActivityLog = ({ activities }) => {
    // Mock data if none provided
    const logs = activities || [
        {
            id: 1,
            user: 'Admin User',
            action: 'Created new product',
            target: 'Hydraulic Pump X-200',
            time: '2 mins ago',
            type: 'success',
        },
        {
            id: 2,
            user: 'Sales Manager',
            action: 'Approved quotation',
            target: 'QT-2025-001',
            time: '15 mins ago',
            type: 'info',
        },
        {
            id: 3,
            user: 'Warehouse Staff',
            action: 'Updated stock',
            target: 'Filter Oil 5L',
            time: '1 hour ago',
            type: 'warning',
        },
        {
            id: 4,
            user: 'System',
            action: 'Low stock alert',
            target: 'Brake Pad Set',
            time: '2 hours ago',
            type: 'danger',
        },
        {
            id: 5,
            user: 'Finance',
            action: 'Generated invoice',
            target: 'INV-2025-042',
            time: '3 hours ago',
            type: 'neutral',
        },
    ];

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return (
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <svg className="h-4 w-4 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                );
            case 'info':
                return (
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <svg className="h-4 w-4 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case 'warning':
                return (
                    <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                        <svg className="h-4 w-4 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                );
            case 'danger':
                return (
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <svg className="h-4 w-4 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                );
        }
    };

    return (
        <Card className="h-full" header="Activity Log">
            <div className="flow-root h-80 overflow-y-auto pr-2 custom-scrollbar">
                <ul className="-mb-8">
                    {logs.map((log, logIdx) => (
                        <li key={log.id}>
                            <div className="relative pb-8">
                                {logIdx !== logs.length - 1 ? (
                                    <span
                                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>{getIcon(log.type)}</div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                <span className="font-medium text-gray-900 dark:text-white mr-1">{log.user}</span>
                                                {log.action} <span className="font-medium text-gray-900 dark:text-white ml-1">{log.target}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            <time dateTime={log.time}>{log.time}</time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    );
};

ActivityLog.propTypes = {
    activities: PropTypes.array,
};

export default ActivityLog;
