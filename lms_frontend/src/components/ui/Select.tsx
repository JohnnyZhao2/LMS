import * as React from "react"
import { cn } from "@/utils/cn"
import { ChevronDown, X, Check } from "lucide-react"

export interface SelectOption {
    value: string
    label: string
    disabled?: boolean
}

export interface SelectProps {
    /** Options to display */
    options: SelectOption[]
    /** Selected value(s) */
    value?: string | string[]
    /** Callback when value changes */
    onChange?: (value: string | string[]) => void
    /** Placeholder text */
    placeholder?: string
    /** Enable multi-select mode */
    multiple?: boolean
    /** Disabled state */
    disabled?: boolean
    /** Error message */
    error?: string
    /** Label for the select */
    label?: string
    /** Additional class names */
    className?: string
    /** ID for the select */
    id?: string
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
    ({ 
        options, 
        value, 
        onChange, 
        placeholder = "请选择...", 
        multiple = false,
        disabled = false,
        error,
        label,
        className,
        id,
    }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false)
        const containerRef = React.useRef<HTMLDivElement>(null)
        const generatedId = React.useId()
        const selectId = id || generatedId
        const errorId = `${selectId}-error`

        // Normalize value to array for easier handling
        const selectedValues = React.useMemo(() => {
            if (!value) return []
            return Array.isArray(value) ? value : [value]
        }, [value])

        // Close dropdown when clicking outside
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false)
                }
            }
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }, [])

        // Handle keyboard navigation
        const handleKeyDown = (event: React.KeyboardEvent) => {
            if (disabled) return
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                setIsOpen(!isOpen)
            } else if (event.key === "Escape") {
                setIsOpen(false)
            }
        }

        const handleOptionClick = (optionValue: string) => {
            if (multiple) {
                const newValues = selectedValues.includes(optionValue)
                    ? selectedValues.filter(v => v !== optionValue)
                    : [...selectedValues, optionValue]
                onChange?.(newValues)
            } else {
                onChange?.(optionValue)
                setIsOpen(false)
            }
        }

        const handleRemoveValue = (valueToRemove: string, event: React.MouseEvent) => {
            event.stopPropagation()
            if (multiple) {
                onChange?.(selectedValues.filter(v => v !== valueToRemove))
            }
        }

        const getDisplayValue = () => {
            if (selectedValues.length === 0) {
                return <span className="text-text-muted">{placeholder}</span>
            }
            
            if (multiple) {
                return (
                    <div className="flex flex-wrap gap-1">
                        {selectedValues.map(val => {
                            const option = options.find(o => o.value === val)
                            return (
                                <span 
                                    key={val}
                                    className="inline-flex items-center gap-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded border border-primary/20"
                                >
                                    {option?.label || val}
                                    <X 
                                        className="h-3 w-3 cursor-pointer hover:text-primary-hover" 
                                        onClick={(e) => handleRemoveValue(val, e)}
                                    />
                                </span>
                            )
                        })}
                    </div>
                )
            }
            
            const selectedOption = options.find(o => o.value === selectedValues[0])
            return selectedOption?.label || selectedValues[0]
        }

        return (
            <div ref={ref} className={cn("w-full", className)}>
                {label && (
                    <label 
                        htmlFor={selectId}
                        className="block text-sm font-medium text-text-secondary mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div ref={containerRef} className="relative">
                    <div
                        id={selectId}
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        tabIndex={disabled ? -1 : 0}
                        className={cn(
                            "flex min-h-10 w-full items-center justify-between rounded-md border bg-background-secondary/50 px-3 py-2 text-sm",
                            "ring-offset-background transition-all duration-200 cursor-pointer",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            "hover:bg-background-secondary hover:border-primary/30",
                            disabled && "cursor-not-allowed opacity-50",
                            error ? "border-destructive" : "border-white/10",
                            isOpen && "ring-2 ring-ring ring-offset-2 bg-background-secondary border-primary/50"
                        )}
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        onKeyDown={handleKeyDown}
                    >
                        <div className="flex-1 text-text-primary">
                            {getDisplayValue()}
                        </div>
                        <ChevronDown className={cn(
                            "h-4 w-4 text-text-muted transition-transform duration-200",
                            isOpen && "rotate-180 text-primary"
                        )} />
                    </div>

                    {isOpen && (
                        <div 
                            role="listbox"
                            aria-multiselectable={multiple}
                            className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-background-secondary shadow-xl max-h-60 overflow-auto animate-scale-in origin-top"
                        >
                            {options.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-text-muted">
                                    无可选项
                                </div>
                            ) : (
                                options.map((option) => {
                                    const isSelected = selectedValues.includes(option.value)
                                    return (
                                        <div
                                            key={option.value}
                                            role="option"
                                            aria-selected={isSelected}
                                            aria-disabled={option.disabled}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors duration-150",
                                                "hover:bg-white/5",
                                                isSelected && "bg-primary/10 text-primary",
                                                option.disabled && "cursor-not-allowed opacity-50"
                                            )}
                                            onClick={() => !option.disabled && handleOptionClick(option.value)}
                                        >
                                            {multiple && (
                                                <div className={cn(
                                                    "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                                    isSelected ? "bg-primary border-primary" : "border-white/20"
                                                )}>
                                                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                                </div>
                                            )}
                                            <span className={cn(!isSelected && "text-text-primary")}>
                                                {option.label}
                                            </span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={errorId} className="mt-1.5 text-xs text-destructive animate-fade-in-up">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
Select.displayName = "Select"

export { Select }
