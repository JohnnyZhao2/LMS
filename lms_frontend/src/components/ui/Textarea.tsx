import * as React from "react"
import { cn } from "@/utils/cn"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Error message to display */
    error?: string
    /** Label for the textarea */
    label?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, label, id, ...props }, ref) => {
        const textareaId = id || React.useId()
        const errorId = `${textareaId}-error`

        return (
            <div className="w-full">
                {label && (
                    <label 
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-text-secondary mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    id={textareaId}
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border bg-background-secondary px-3 py-2 text-sm text-text-primary",
                        "ring-offset-background transition-colors resize-y",
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
Textarea.displayName = "Textarea"

export { Textarea }
