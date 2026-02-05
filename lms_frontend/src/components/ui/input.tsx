import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input 组件 - 平面设计系统
 * 
 * 特性：
 * - 无阴影设计
 * - 默认灰色背景，聚焦时白色背景 + 蓝色边框
 * - 统一高度 h-14
 * - 平滑过渡动画
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border-none bg-muted px-4 py-3 theme-input",
          "text-base font-medium text-foreground",
          "placeholder:text-text-muted",
          "focus:bg-background focus:outline-none focus:border-2 focus:border-primary",
          "disabled:bg-muted disabled:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200",
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
