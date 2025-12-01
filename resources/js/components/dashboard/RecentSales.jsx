import React from "react"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

export function RecentSales({ data = [] }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                No recent sales found.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {data.map((sale) => (
                <div key={sale.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={sale.avatar || "/avatars/default.png"} alt="Avatar" />
                        <AvatarFallback>{sale.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{sale.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {sale.email}
                        </p>
                    </div>
                    <div className="ml-auto font-medium">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(sale.amount)}
                    </div>
                </div>
            ))}
        </div>
    )
}
