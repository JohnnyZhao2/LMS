import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full rounded-2xl border-none bg-[#EFEBF5] px-6 py-4 text-lg text-clay-foreground shadow-clay-pressed transition-all duration-200 placeholder:text-clay-muted focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
