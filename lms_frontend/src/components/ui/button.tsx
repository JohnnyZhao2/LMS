/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary-hover hover:scale-105",
        destructive:
          "bg-destructive text-white hover:bg-destructive hover:scale-105",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-white",
        secondary:
          "bg-muted text-foreground hover:bg-muted-hover hover:scale-105",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-secondary text-white hover:bg-secondary-hover hover:scale-105",
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
