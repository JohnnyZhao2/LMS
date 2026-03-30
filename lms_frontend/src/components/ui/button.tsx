/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-bold tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98] active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-primary-hover",
        destructive:
          "bg-destructive text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-destructive",
        outline:
          "border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] text-foreground shadow-[0_8px_22px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.1)]",
        secondary:
          "bg-muted text-foreground hover:bg-muted-hover hover:-translate-y-0.5 hover:shadow-sm",
        ghost: "text-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-secondary text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-secondary-hover",
      },
      size: {
        default: "h-12 px-6 py-3 text-base rounded-md [&_svg]:size-5",
        sm: "h-9 px-4 text-sm rounded-md [&_svg]:size-4",
        lg: "h-14 px-8 text-lg rounded-lg [&_svg]:size-6",
        icon: "h-12 w-12 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), "theme-button")}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
