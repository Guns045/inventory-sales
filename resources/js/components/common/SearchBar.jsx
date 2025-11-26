import * as React from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * SearchBar component with debouncing and suggestions
 * @param {string} value - Search value
 * @param {Function} onChange - Change handler
 * @param {string} placeholder - Input placeholder
 * @param {Array} suggestions - Suggestion items
 * @param {Function} onSelectSuggestion - Suggestion select handler
 * @param {boolean} searching - Loading state
 */
export function SearchBar({
    value,
    onChange,
    placeholder = "Search...",
    suggestions = [],
    onSelectSuggestion,
    searching = false,
    className
}) {
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const containerRef = React.useRef(null)

    // Close suggestions when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Show suggestions when there are items
    React.useEffect(() => {
        if (suggestions.length > 0) {
            setShowSuggestions(true)
        }
    }, [suggestions])

    const handleClear = () => {
        onChange('')
        setShowSuggestions(false)
    }

    const handleSelectSuggestion = (suggestion) => {
        if (onSelectSuggestion) {
            onSelectSuggestion(suggestion)
        }
        setShowSuggestions(false)
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="pl-10 pr-10"
                />
                {value && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
                {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    </div>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={suggestion.id || index}
                                className="cursor-pointer border-b border-gray-100 px-4 py-3 hover:bg-gray-50 last:border-b-0"
                                onClick={() => handleSelectSuggestion(suggestion)}
                            >
                                <div className="font-medium text-sm">{suggestion.name || suggestion.title}</div>
                                {suggestion.description && (
                                    <div className="text-xs text-gray-500 mt-1">{suggestion.description}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
