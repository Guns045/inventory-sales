import * as React from "react"
import { Badge } from "@/components/ui/badge"

/**
 * StatusBadge component for displaying transaction status
 * @param {string} status - Status value
 * @param {object} config - Custom status configuration
 */
export function StatusBadge({ status, config }) {
    const defaultConfig = {
        'DRAFT': { variant: 'secondary', label: 'Draft' },
        'PENDING': { variant: 'warning', label: 'Pending' },
        'PROCESSING': { variant: 'default', label: 'Processing' },
        'APPROVED': { variant: 'success', label: 'Approved' },
        'REJECTED': { variant: 'destructive', label: 'Rejected' },
        'READY_TO_SHIP': { variant: 'default', label: 'Ready to Ship' },
        'SHIPPED': { variant: 'success', label: 'Shipped' },
        'DELIVERED': { variant: 'success', label: 'Delivered' },
        'COMPLETED': { variant: 'success', label: 'Completed' },
        'CANCELLED': { variant: 'destructive', label: 'Cancelled' },
        'PAID': { variant: 'success', label: 'Paid' },
        'UNPAID': { variant: 'warning', label: 'Unpaid' },
        'PARTIAL': { variant: 'default', label: 'Partial' }
    }

    const statusConfig = config || defaultConfig
    const currentStatus = statusConfig[status] || { variant: 'secondary', label: status }

    return (
        <Badge
            variant={currentStatus.variant}
            className={status === 'CANCELLED' ? "bg-red-100 text-red-600 hover:bg-red-200 border-0" : ""}
        >
            {currentStatus.label}
        </Badge>
    )
}
