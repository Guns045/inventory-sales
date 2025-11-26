import * as React from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * PageHeader component for page titles and actions
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {Function} onAdd - Add button click handler
 * @param {string} addButtonText - Add button text
 * @param {ReactNode} actions - Custom action buttons
 */
export function PageHeader({
    title,
    description,
    onAdd,
    addButtonText = "Add New",
    actions,
    className
}) {
    return (
        <div className={cn("flex items-center justify-between", className)}>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-muted-foreground mt-1">{description}</p>
                )}
            </div>

            <div className="flex items-center gap-2">
                {actions}
                {onAdd && (
                    <Button onClick={onAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        {addButtonText}
                    </Button>
                )}
            </div>
        </div>
    )
}
