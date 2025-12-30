import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
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
