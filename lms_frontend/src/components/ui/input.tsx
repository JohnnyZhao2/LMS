import * as React from "react"

import { FIELD_CHROME_CLASSNAME } from "@/components/ui/interactive-styles"
import { cn } from "@/lib/utils"

/**
 * Input 组件 - 平面设计系统
 * 
 * 特性：
 * - 无阴影设计
 * - 默认白色背景，聚焦时保持白色 + 蓝色边框
 * - 统一高度 h-14
 * - 平滑过渡动画
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md px-4 py-3 theme-input",
          FIELD_CHROME_CLASSNAME,
          "text-base font-medium text-foreground",
          "placeholder:text-text-muted",
          "disabled:bg-white disabled:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed",
          type === "number" && "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0",
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
