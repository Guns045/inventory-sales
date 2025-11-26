import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

/**
 * FormDialog component for create/edit forms
 * @param {boolean} open - Dialog open state
 * @param {Function} onOpenChange - Open state change handler
 * @param {string} title - Dialog title
 * @param {string} description - Dialog description
 * @param {ReactNode} children - Form content
 * @param {Function} onSubmit - Submit handler
 * @param {boolean} loading - Loading state
 * @param {string} submitText - Submit button text
 * @param {string} cancelText - Cancel button text
 */
export function FormDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    onSubmit,
    loading = false,
    submitText = "Save",
    cancelText = "Cancel",
    hideFooter = false
}) {
    const handleSubmit = (e) => {
        e.preventDefault()
        if (onSubmit) {
            onSubmit()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>

                    <div className="py-4">
                        {children}
                    </div>

                    {!hideFooter && (
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                            >
                                {cancelText}
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitText}
                            </Button>
                        </DialogFooter>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    )
}
