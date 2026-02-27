import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/**
 * Pagination component
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {Function} onPageChange - Page change handler
 * @param {number} perPage - Items per page
 * @param {Function} onPerPageChange - Per page change handler
 * @param {number} from - Start index
 * @param {number} to - End index
 * @param {number} total - Total items
 * @param {boolean} showInfo - Show pagination info
 */
const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    perPage = 20,
    onPerPageChange,
    from,
    to,
    total,
    showInfo = true,
    className
}) => {
    const canGoPrev = currentPage > 1
    const canGoNext = currentPage < totalPages

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className={cn(
            "flex items-center justify-between bg-white px-2 py-3 sm:px-4",
            className
        )}>
            {/* Mobile View */}
            <div className="flex flex-1 items-center justify-between sm:hidden">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canGoPrev}
                    className="text-xs"
                >
                    Previous
                </Button>
                <span className="text-xs font-medium">
                    {currentPage} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canGoNext}
                    className="text-xs"
                >
                    Next
                </Button>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    {showInfo && total > 0 && (
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                            Showing <span className="font-semibold text-foreground">{from}</span> to{' '}
                            <span className="font-semibold text-foreground">{to}</span> of{' '}
                            <span className="font-semibold text-foreground">{total}</span> results
                        </p>
                    )}

                    {onPerPageChange && (
                        <div className="flex items-center gap-2 border-l pl-4">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                            <Select
                                value={perPage.toString()}
                                onValueChange={(value) => onPerPageChange(parseInt(value))}
                            >
                                <SelectTrigger className="h-8 w-[80px] text-xs">
                                    <SelectValue placeholder={perPage} />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50, 100].map((option) => (
                                        <SelectItem key={option} value={option.toString()} className="text-xs">
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 px-3 text-sm font-medium transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40",
                            !canGoPrev ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canGoPrev}
                    >
                        Previous
                    </Button>

                    <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, idx) => (
                            page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">...</span>
                            ) : (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "min-w-[32px] h-8 p-0 text-sm font-medium transition-all",
                                        currentPage === page
                                            ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                                            : "text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600"
                                    )}
                                    onClick={() => onPageChange(page)}
                                >
                                    {page}
                                </Button>
                            )
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 px-3 text-sm font-medium transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 text-indigo-600",
                            !canGoNext ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canGoNext}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default Pagination;
