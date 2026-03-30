import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea 组件 - 平面设计系统
 * 
 * 特性：
 * - 无阴影设计
 * - 默认白色背景，聚焦时保持白色 + 蓝色边框
 * - 最小高度 min-h-[120px]
 * - 平滑过渡动画
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-md border border-border bg-white px-4 py-3",
          "text-base font-normal text-foreground leading-relaxed",
          "placeholder:text-text-muted",
          "focus:outline-none focus:bg-white focus:border-2 focus:border-primary",
          "disabled:bg-white disabled:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200 resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
