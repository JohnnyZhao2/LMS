import * as React from "react"
import { cn } from "@/utils/cn"

export type CardVariant = 'default' | 'glass' | 'bland' | 'gradient'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Card style variant */
    variant?: CardVariant
    /** Enable hover effect */
    hoverable?: boolean
    /** Make card clickable (adds cursor and focus styles) */
    clickable?: boolean
}

const variantStyles: Record<CardVariant, string> = {
    default: "bg-card text-card-foreground border border-white/10 shadow-lg",
    glass: "glass-panel text-card-foreground backdrop-blur-sm bg-white/5",
    bland: "bg-transparent border-none shadow-none",
    gradient: "bg-gradient-to-br from-card to-background-secondary border border-white/10 shadow-lg relative overflow-hidden"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', hoverable = false, clickable = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                className={cn(
                    "rounded-xl transition-all duration-300",
                    variantStyles[variant],
                    hoverable && "hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,229,255,0.15)] hover:-translate-y-1",
                    clickable && [
                        "cursor-pointer",
                        "hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,229,255,0.15)] hover:-translate-y-1",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        "active:scale-[0.99]"
                    ],
                    variant === 'gradient' && "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                    className
                )}
                {...props}
            />
        )
    }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6 relative z-10", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-xl font-heading font-semibold leading-none tracking-tight text-white",
            className
        )}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-text-muted", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0 relative z-10", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0 relative z-10", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
