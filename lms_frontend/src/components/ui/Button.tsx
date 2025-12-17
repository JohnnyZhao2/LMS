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
    primary: "bg-primary text-white hover:bg-primary-hover shadow-[0_0_20px_rgba(176,38,255,0.4)] border border-primary/20 hover:shadow-[0_0_30px_rgba(176,38,255,0.6)]",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-sm",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 shadow-[0_0_15px_rgba(255,46,95,0.2)]",
    ghost: "bg-transparent text-text-secondary hover:text-white hover:bg-white/5",
    outline: "bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-primary/50 hover:text-primary hover:shadow-[0_0_15px_rgba(176,38,255,0.2)]",
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-10 px-5 py-2 text-sm gap-2 rounded-xl",
    lg: "h-12 px-8 text-base gap-2.5 rounded-xl",
    icon: "h-10 w-10 p-0 rounded-xl",
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
                    "inline-flex items-center justify-center font-medium transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:pointer-events-none disabled:opacity-50",
                    "active:scale-[0.96]",
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
