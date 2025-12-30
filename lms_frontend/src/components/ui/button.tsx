import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary-500 text-white hover:bg-primary-600 hover:shadow-[0_4px_12px_rgba(77,108,255,0.25)] hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-error-500 text-white hover:bg-error-600 hover:shadow-[0_4px_12px_rgba(255,61,113,0.25)] hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
        ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        link: "text-primary-500 underline-offset-4 hover:underline",
        success:
          "bg-success-500 text-white hover:bg-success-600 hover:shadow-[0_4px_12px_rgba(16,183,89,0.25)] hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default: "h-10 px-5 py-2.5 text-sm rounded-[10px] min-w-[120px] [&_svg]:size-4",
        sm: "h-8 px-4 py-2 text-[13px] rounded-lg min-w-[100px] [&_svg]:size-3.5",
        lg: "h-12 px-7 py-3.5 text-[15px] rounded-xl min-w-[140px] [&_svg]:size-4",
        xs: "h-7 px-3 py-1.5 text-xs rounded-md min-w-[80px] [&_svg]:size-3",
        icon: "h-9 w-9 rounded-lg",
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
