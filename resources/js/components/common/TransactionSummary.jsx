import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"

/**
 * TransactionSummary component for displaying totals
 * @param {number} subtotal - Subtotal amount
 * @param {number} discount - Total discount
 * @param {number} tax - Total tax
 * @param {number} total - Grand total
 */
export function TransactionSummary({ subtotal, discount, tax, total }) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value || 0)
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-medium text-red-600">-{formatCurrency(discount)}</span>
                        </div>
                    )}
                    {tax > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax:</span>
                            <span className="font-medium">{formatCurrency(tax)}</span>
                        </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                            <span className="font-semibold text-lg">Total:</span>
                            <span className="font-bold text-lg text-blue-600">{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
