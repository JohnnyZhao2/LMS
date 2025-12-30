import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-clay-primary/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clay-btn hover:shadow-clay-btn-hover hover:-translate-y-1 active:shadow-clay-pressed",
        destructive:
          "bg-gradient-to-br from-red-400 to-red-600 text-white shadow-clay-btn hover:shadow-clay-btn-hover hover:-translate-y-1 active:shadow-clay-pressed",
        outline:
          "border-2 border-clay-primary/20 bg-transparent text-clay-primary hover:bg-clay-primary/5 hover:border-clay-primary shadow-sm hover:-translate-y-0.5",
        secondary:
          "bg-white text-clay-foreground shadow-clay-btn hover:shadow-clay-btn-hover hover:-translate-y-1 active:shadow-clay-pressed",
        ghost: "text-clay-foreground hover:bg-clay-primary/10 hover:text-clay-primary",
        link: "text-clay-primary underline-offset-4 hover:underline",
        success:
          "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-clay-btn hover:shadow-clay-btn-hover hover:-translate-y-1 active:shadow-clay-pressed",
      },
      size: {
        default: "h-14 px-8 py-4 text-base rounded-2xl [&_svg]:size-5",
        sm: "h-11 px-6 text-sm rounded-xl [&_svg]:size-4",
        lg: "h-16 px-10 text-lg rounded-3xl [&_svg]:size-6",
        icon: "h-14 w-14 rounded-2xl",
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
