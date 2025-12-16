import * as React from "react"
import { cn } from "@/utils/cn"

export interface SpinnerProps {
    /** Size of the spinner */
    size?: 'sm' | 'md' | 'lg' | 'xl'
    /** Color variant */
    variant?: 'primary' | 'secondary' | 'white'
    /** Additional class names */
    className?: string
    /** Accessible label */
    label?: string
}

const sizeStyles = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
    xl: "h-12 w-12 border-4",
}

const variantStyles = {
    primary: "border-primary/30 border-t-primary",
    secondary: "border-text-muted/30 border-t-text-muted",
    white: "border-white/30 border-t-white",
}

const Spinner: React.FC<SpinnerProps> = ({
    size = 'md',
    variant = 'primary',
    className,
    label = "加载中",
}) => {
    return (
        <div
            role="status"
            aria-label={label}
            className={cn(
                "animate-spin rounded-full",
                sizeStyles[size],
                variantStyles[variant],
                className
            )}
        >
            <span className="sr-only">{label}</span>
        </div>
    )
}
Spinner.displayName = "Spinner"

// Full page loading spinner
export interface LoadingOverlayProps {
    /** Whether to show the overlay */
    visible?: boolean
    /** Loading text */
    text?: string
    /** Spinner size */
    size?: SpinnerProps['size']
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    visible = true,
    text = "加载中...",
    size = 'lg',
}) => {
    if (!visible) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
                <Spinner size={size} />
                {text && (
                    <span className="text-sm text-text-muted">{text}</span>
                )}
            </div>
        </div>
    )
}
LoadingOverlay.displayName = "LoadingOverlay"

// Inline loading indicator
export interface InlineLoaderProps {
    /** Loading text */
    text?: string
    /** Additional class names */
    className?: string
}

const InlineLoader: React.FC<InlineLoaderProps> = ({
    text = "加载中...",
    className,
}) => {
    return (
        <div className={cn("flex items-center gap-2 text-text-muted", className)}>
            <Spinner size="sm" />
            {text && <span className="text-sm">{text}</span>}
        </div>
    )
}
InlineLoader.displayName = "InlineLoader"

export { Spinner, LoadingOverlay, InlineLoader }
