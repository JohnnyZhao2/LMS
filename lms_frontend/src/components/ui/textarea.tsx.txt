import * as React from "react"

import { FIELD_CHROME_CLASSNAME } from "@/components/ui/interactive-styles"
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
type TextareaProps = React.ComponentProps<"textarea"> & {
  autoResize?: boolean
  interactionStyle?: "default" | "minimal"
}

const syncTextareaHeight = (node: HTMLTextAreaElement | null) => {
  if (!node) return
  node.style.height = "0px"
  node.style.height = `${node.scrollHeight}px`
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ autoResize = false, interactionStyle = "default", className, onChange, style, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    React.useLayoutEffect(() => {
      if (!autoResize) return
      syncTextareaHeight(innerRef.current)
    }, [autoResize, props.value])

    const setRefs = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node

      if (typeof ref === "function") {
        ref(node)
        return
      }

      if (ref) {
        ref.current = node
      }
    }

    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-lg px-4 py-3",
          interactionStyle === "default" ? FIELD_CHROME_CLASSNAME : "focus:outline-none",
          "text-base font-normal text-foreground leading-relaxed",
          "placeholder:text-text-muted",
          "disabled:bg-white disabled:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed",
          "resize-y",
          autoResize && "overflow-hidden",
          className
        )}
        ref={setRefs}
        onChange={(event) => {
          if (autoResize) {
            syncTextareaHeight(event.currentTarget)
          }
          onChange?.(event)
        }}
        style={autoResize ? { ...style, overflowY: "hidden" } : style}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
