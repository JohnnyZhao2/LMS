import * as React from "react"
import { cn } from "@/utils/cn"
import { Check } from "lucide-react"

export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    /** Label for the checkbox */
    label?: string
    /** Error message */
    error?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, error, id, disabled, checked, ...props }, ref) => {
        const checkboxId = id || React.useId()
        const errorId = `${checkboxId}-error`

        return (
            <div className="flex flex-col">
                <label 
                    htmlFor={checkboxId}
                    className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        disabled && "cursor-not-allowed opacity-50"
                    )}
                >
                    <div className="relative">
                        <input
                            type="checkbox"
                            id={checkboxId}
                            ref={ref}
                            disabled={disabled}
                            checked={checked}
                            className="peer sr-only"
                            aria-invalid={!!error}
                            aria-describedby={error ? errorId : undefined}
                            {...props}
                        />
                        <div
                            className={cn(
                                "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                                checked 
                                    ? "bg-primary border-primary" 
                                    : "bg-background-secondary border-input",
                                error && "border-destructive",
                                className
                            )}
                        >
                            {checked && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                        </div>
                    </div>
                    {label && (
                        <span className="text-sm text-text-primary select-none">
                            {label}
                        </span>
                    )}
                </label>
                {error && (
                    <p id={errorId} className="mt-1 text-xs text-destructive ml-6">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
