import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

/**
 * StatsCard component for displaying statistics
 * @param {string} title - Card title
 * @param {string|number} value - Stat value
 * @param {ReactNode} icon - Icon component
 * @param {string} trend - Trend indicator (+12%, -5%, etc)
 * @param {string} variant - Color variant
 */
export function StatsCard({
    title,
    value,
    icon,
    trend,
    variant = "default",
    className
}) {
    const variantClasses = {
        default: "bg-white border-gray-200",
        primary: "bg-blue-50 border-blue-200",
        success: "bg-green-50 border-green-200",
        warning: "bg-yellow-50 border-yellow-200",
        danger: "bg-red-50 border-red-200",
        info: "bg-cyan-50 border-cyan-200"
    }

    const iconColorClasses = {
        default: "text-gray-600",
        primary: "text-blue-600",
        success: "text-green-600",
        warning: "text-yellow-600",
        danger: "text-red-600",
        info: "text-cyan-600"
    }

    const trendIsPositive = trend && trend.startsWith('+')
    const trendIsNegative = trend && trend.startsWith('-')

    return (
        <Card className={cn(variantClasses[variant], className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                    {title}
                </CardTitle>
                {icon && (
                    <div className={iconColorClasses[variant]}>
                        {icon}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <div className="flex items-center mt-1 text-xs">
                        {trendIsPositive && <TrendingUp className="h-3 w-3 text-green-600 mr-1" />}
                        {trendIsNegative && <TrendingDown className="h-3 w-3 text-red-600 mr-1" />}
                        <span className={cn(
                            trendIsPositive && "text-green-600",
                            trendIsNegative && "text-red-600",
                            !trendIsPositive && !trendIsNegative && "text-gray-600"
                        )}>
                            {trend}
                        </span>
                        <span className="text-gray-500 ml-1">from last period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
