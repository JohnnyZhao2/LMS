import * as React from "react"
import { cn } from "@/utils/cn"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Error message to display */
    error?: string
    /** Label for the input */
    label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, label, id, ...props }, ref) => {
        const inputId = id || React.useId()
        const errorId = `${inputId}-error`

        return (
            <div className="w-full">
                {label && (
                    <label 
                        htmlFor={inputId}
                        className="block text-sm font-medium text-text-secondary mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-md border bg-background-secondary px-3 py-2 text-sm text-text-primary",
                        "ring-offset-background transition-colors",
                        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                        "placeholder:text-text-muted",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        error 
                            ? "border-destructive focus-visible:ring-destructive" 
                            : "border-input",
                        className
                    )}
                    ref={ref}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    {...props}
                />
                {error && (
                    <p id={errorId} className="mt-1.5 text-xs text-destructive">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
