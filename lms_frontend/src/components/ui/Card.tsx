import * as React from "react"
import { cn } from "@/utils/cn"

export type CardVariant = 'default' | 'glass' | 'bland'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Card style variant */
    variant?: CardVariant
    /** Enable hover effect */
    hoverable?: boolean
    /** Make card clickable (adds cursor and focus styles) */
    clickable?: boolean
}

const variantStyles: Record<CardVariant, string> = {
    default: "bg-background-secondary/40 backdrop-blur-md border border-white/5 shadow-xl supports-[backdrop-filter]:bg-background-secondary/20",
    glass: "glass-panel bg-white/5 hover:bg-white/10 transition-colors",
    bland: "bg-transparent border-none shadow-none"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', hoverable = false, clickable = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                className={cn(
                    "rounded-2xl transition-all duration-300",
                    variantStyles[variant],
                    hoverable && "hover:border-primary/30 hover:shadow-[0_0_30px_rgba(176,38,255,0.15)] hover:-translate-y-1",
                    clickable && [
                        "cursor-pointer",
                        "hover:border-primary/40 hover:shadow-[0_0_30px_rgba(176,38,255,0.2)] hover:-translate-y-1",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        "active:scale-[0.98]"
                    ],
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
        className={cn("flex flex-col space-y-1.5 p-6", className)}
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
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
