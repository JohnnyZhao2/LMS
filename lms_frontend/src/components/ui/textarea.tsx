import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea 组件 - 平面设计系统
 * 
 * 特性：
 * - 无阴影设计
 * - 默认灰色背景，聚焦时白色背景 + 蓝色边框
 * - 最小高度 min-h-[120px]
 * - 平滑过渡动画
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-md border-none bg-gray-100 px-6 py-4",
          "text-base font-normal text-gray-900 leading-relaxed",
          "placeholder:text-gray-500",
          "focus:outline-none focus:bg-white focus:border-2 focus:border-blue-600",
          "disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed",
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
