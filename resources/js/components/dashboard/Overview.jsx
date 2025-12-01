import React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

const mockData = [
    { name: "Jan", revenue: 45000000 },
    { name: "Feb", revenue: 52000000 },
    { name: "Mar", revenue: 48000000 },
    { name: "Apr", revenue: 61000000 },
    { name: "May", revenue: 55000000 },
    { name: "Jun", revenue: 67000000 },
    { name: "Jul", revenue: 72000000 },
    { name: "Aug", revenue: 69000000 },
    { name: "Sep", revenue: 78000000 },
    { name: "Oct", revenue: 85000000 },
    { name: "Nov", revenue: 92000000 },
    { name: "Dec", revenue: 88000000 },
]

export function Overview({ data = [] }) {
    const chartData = data

    return (
        <div className="h-[350px] w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(value)}
                        />
                        <Tooltip
                            formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Total Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    No sales data available for this period.
                </div>
            )}
        </div>
    )
}
