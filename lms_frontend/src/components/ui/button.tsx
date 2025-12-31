import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 hover:scale-105",
        outline:
          "border-4 border-blue-600 bg-transparent text-blue-600 hover:bg-blue-600 hover:text-white",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 hover:scale-105",
        ghost: "text-gray-900 hover:bg-gray-100",
        link: "text-blue-600 underline-offset-4 hover:underline",
        success:
          "bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105",
      },
      size: {
        default: "h-14 px-8 py-4 text-base rounded-md [&_svg]:size-5",
        sm: "h-11 px-6 text-sm rounded-md [&_svg]:size-4",
        lg: "h-16 px-10 text-lg rounded-lg [&_svg]:size-6",
        icon: "h-14 w-14 rounded-md",
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
