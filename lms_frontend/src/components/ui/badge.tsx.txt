/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-primary [&_svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-white",
        secondary:
          "bg-muted text-foreground",
        destructive:
          "bg-error-500 text-white",
        outline:
          "text-foreground border border-border bg-background",
        success:
          "bg-success-50 text-success-500 border border-success-500",
        warning:
          "bg-warning-50 text-warning-800",
        error:
          "bg-error-50 text-error-500 border border-error-500",
        info:
          "bg-primary-50 text-primary-500 border border-primary-500",
        open:
          "bg-warning-50 text-warning-400 border border-warning-400",
        closed:
          "bg-error-50 text-error-500 border border-error-500",
        confirmed:
          "bg-success-50 text-success-500 border border-success-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
