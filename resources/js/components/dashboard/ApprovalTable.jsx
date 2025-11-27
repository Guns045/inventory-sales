import React from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

/**
 * ApprovalTable Component
 * Displays quotations pending approval
 */
const ApprovalTable = ({ approvals, onApprove, onReject }) => {
    // Mock data if none provided
    const approvalData = approvals || [
        { id: 1, number: 'QT-2025-001', customer: 'PT Maju Jaya', amount: 'Rp 15.000.000', date: '2025-11-28' },
        { id: 2, number: 'QT-2025-002', customer: 'CV Berkah Abadi', amount: 'Rp 8.500.000', date: '2025-11-27' },
        { id: 3, number: 'QT-2025-003', customer: 'PT Sinar Harapan', amount: 'Rp 42.000.000', date: '2025-11-27' },
        { id: 4, number: 'QT-2025-004', customer: 'Bengkel Pak Budi', amount: 'Rp 2.100.000', date: '2025-11-26' },
    ];

    return (
        <Card className="h-full" header="Pending Approvals" noPadding>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Quotation
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Amount
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {approvalData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                            {item.number}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.customer}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {item.date}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                        {item.amount}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => onApprove && onApprove(item.id)}
                                            title="Approve"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => onReject && onReject(item.id)}
                                            title="Reject"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-right">
                <a href="/approvals" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    View all approvals &rarr;
                </a>
            </div>
        </Card>
    );
};

ApprovalTable.propTypes = {
    approvals: PropTypes.array,
    onApprove: PropTypes.func,
    onReject: PropTypes.func,
};

export default ApprovalTable;
