import * as React from "react"
import { cn } from "@/utils/cn"
import { Loader2 } from "lucide-react"

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button style variant */
    variant?: ButtonVariant
    /** Button size */
    size?: ButtonSize
    /** Show loading spinner and disable button */
    loading?: boolean
    /** Alias for loading prop */
    isLoading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_15px_rgba(0,229,255,0.3)] border border-transparent",
    secondary: "bg-secondary text-secondary-foreground hover:bg-background-tertiary border border-border",
    danger: "bg-destructive text-destructive-foreground hover:bg-red-600 border border-transparent",
    ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent",
    outline: "bg-transparent border border-primary text-primary hover:bg-primary/10",
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 py-2 text-sm gap-2",
    lg: "h-12 px-8 text-base gap-2.5",
    icon: "h-10 w-10 p-0",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ 
        className, 
        variant = 'primary', 
        size = 'md', 
        loading,
        isLoading,
        disabled,
        children, 
        ...props 
    }, ref) => {
        const isLoadingState = loading || isLoading
        const isDisabled = disabled || isLoadingState

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-md font-medium transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:pointer-events-none disabled:opacity-50",
                    "active:scale-[0.98]",
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                ref={ref}
                disabled={isDisabled}
                aria-busy={isLoadingState}
                {...props}
            >
                {isLoadingState && (
                    <Loader2 
                        className={cn(
                            "animate-spin",
                            size === 'sm' ? "h-3 w-3" : size === 'lg' ? "h-5 w-5" : "h-4 w-4"
                        )} 
                        aria-hidden="true"
                    />
                )}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
