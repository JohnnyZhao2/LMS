import * as React from "react"
import { cn } from "@/utils/cn"

export interface RadioOption {
    value: string
    label: string
    disabled?: boolean
}

export interface RadioGroupProps {
    /** Name for the radio group */
    name: string
    /** Options to display */
    options: RadioOption[]
    /** Selected value */
    value?: string
    /** Callback when value changes */
    onChange?: (value: string) => void
    /** Disabled state for all options */
    disabled?: boolean
    /** Error message */
    error?: string
    /** Label for the radio group */
    label?: string
    /** Layout direction */
    direction?: 'horizontal' | 'vertical'
    /** Additional class names */
    className?: string
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({ 
        name,
        options, 
        value, 
        onChange, 
        disabled = false,
        error,
        label,
        direction = 'vertical',
        className,
    }, ref) => {
        const groupId = React.useId()
        const errorId = `${groupId}-error`

        const handleChange = (optionValue: string) => {
            if (!disabled) {
                onChange?.(optionValue)
            }
        }

        return (
            <div ref={ref} className={cn("w-full", className)} role="radiogroup" aria-labelledby={label ? `${groupId}-label` : undefined}>
                {label && (
                    <div 
                        id={`${groupId}-label`}
                        className="block text-sm font-medium text-text-secondary mb-2"
                    >
                        {label}
                    </div>
                )}
                <div 
                    className={cn(
                        "flex gap-3",
                        direction === 'vertical' ? "flex-col" : "flex-row flex-wrap"
                    )}
                >
                    {options.map((option) => {
                        const optionId = `${groupId}-${option.value}`
                        const isSelected = value === option.value
                        const isDisabled = disabled || option.disabled

                        return (
                            <label
                                key={option.value}
                                htmlFor={optionId}
                                className={cn(
                                    "flex items-center gap-2 cursor-pointer",
                                    isDisabled && "cursor-not-allowed opacity-50"
                                )}
                            >
                                <div className="relative">
                                    <input
                                        type="radio"
                                        id={optionId}
                                        name={name}
                                        value={option.value}
                                        checked={isSelected}
                                        disabled={isDisabled}
                                        onChange={() => handleChange(option.value)}
                                        className="peer sr-only"
                                        aria-describedby={error ? errorId : undefined}
                                    />
                                    <div
                                        className={cn(
                                            "h-4 w-4 rounded-full border flex items-center justify-center transition-colors",
                                            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                                            isSelected 
                                                ? "border-primary" 
                                                : "bg-background-secondary border-input",
                                            error && "border-destructive"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                        )}
                                    </div>
                                </div>
                                <span className="text-sm text-text-primary select-none">
                                    {option.label}
                                </span>
                            </label>
                        )
                    })}
                </div>
                {error && (
                    <p id={errorId} className="mt-1.5 text-xs text-destructive">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
RadioGroup.displayName = "RadioGroup"

export { RadioGroup }
