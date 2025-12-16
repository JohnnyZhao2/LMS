import * as React from "react"
import { cn } from "@/utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'neon'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "bg-primary/20 text-primary border-primary/20",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        outline: "text-text-primary border-border",
        success: "bg-status-success/20 text-status-success border-status-success/20",
        warning: "bg-status-warning/20 text-status-warning border-status-warning/20",
        destructive: "bg-status-error/20 text-status-error border-status-error/20",
        neon: "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,229,255,0.4)] font-bold border-transparent"
    }

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                variants[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }
