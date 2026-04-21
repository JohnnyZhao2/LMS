import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { FIELD_CHROME_CLASSNAME } from "@/components/ui/interactive-styles"
import { cn } from "@/lib/utils"

type SelectVisualVariant = "default" | "ghost-pill"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Value>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Value
    ref={ref}
    className={cn("block min-w-0 truncate", className)}
    {...props}
  />
))
SelectValue.displayName = SelectPrimitive.Value.displayName

const COMPACT_FILTER_SELECT_CLASSNAME = "w-[8rem] max-w-full shrink-0"

function getSelectTriggerVariantClass(variant: SelectVisualVariant) {
  if (variant === "ghost-pill") {
    return cn(
      "h-[34px] rounded-full border border-black/8 bg-white/70 px-[14px]",
      "text-[12px] font-medium text-[#777] backdrop-blur-md",
      "data-[placeholder]:text-[#b5b5bc]",
      "hover:bg-white/92",
      "data-[state=open]:border-black/10 data-[state=open]:bg-white/94 data-[state=open]:shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
    )
  }

  return cn(
    "flex h-10 w-full min-w-0 items-center justify-between gap-2 overflow-hidden whitespace-nowrap",
    "rounded-xl px-4",
    FIELD_CHROME_CLASSNAME,
    "text-[13px] font-medium text-foreground data-[placeholder]:text-text-muted/58",
    "shadow-none",
    "data-[state=open]:border-primary-300 data-[state=open]:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]",
    "disabled:cursor-not-allowed disabled:bg-muted/30 disabled:text-text-muted disabled:opacity-60"
  )
}

function getSelectContentVariantClass(variant: SelectVisualVariant) {
  if (variant === "ghost-pill") {
    return cn(
      "rounded-[28px] border border-black/8 bg-[rgba(255,255,255,0.92)] text-foreground",
      "shadow-[0_20px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl"
    )
  }

  return cn(
    "rounded-lg",
    "bg-white text-foreground shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
  )
}

function getSelectViewportVariantClass(variant: SelectVisualVariant) {
  if (variant === "ghost-pill") {
    return "flex flex-col gap-1 p-2"
  }

  return "flex flex-col gap-1 p-1.5"
}

function getSelectItemVariantClass(variant: SelectVisualVariant) {
  if (variant === "ghost-pill") {
    return cn(
      "rounded-[18px] py-2.5 pl-10 pr-4 text-[12px] font-medium text-[#2f3542]",
      "focus:bg-[#4d90ee] focus:text-white",
      "data-[state=checked]:bg-[#4d90ee] data-[state=checked]:font-semibold data-[state=checked]:text-white"
    )
  }

  return cn(
    "rounded-md py-2 pl-4 pr-8 text-[13px] font-medium",
    "focus:bg-primary-50/70 focus:text-foreground",
    "data-[state=checked]:bg-primary-50/85 data-[state=checked]:font-semibold"
  )
}

/**
 * SelectTrigger 组件
 *
 * 统一使用紧凑的白色圆角方形样式，控制在业务后台可接受的密度内。
 */
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    variant?: SelectVisualVariant
  }
>(({ className, children, variant = "default", ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      getSelectTriggerVariantClass(variant),
      "[&>*:first-child]:min-w-0 [&>*:first-child]:flex-1 [&>*:first-child]:overflow-hidden",
      "[&>span]:line-clamp-1",
      className
    )}
    data-variant={variant}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className={cn(
        "h-4 w-4 shrink-0",
        variant === "ghost-pill" ? "text-[#8f95a3]" : "text-text-muted/80"
      )} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

/**
 * SelectContent 组件
 *
 * 与触发器保持同一套圆角语言，但菜单本身保持紧凑，不做夸张放大。
 */
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
    variant?: SelectVisualVariant
  }
>(({ className, children, position = "popper", variant = "default", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden",
        getSelectContentVariantClass(variant),
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        "data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
        "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          getSelectViewportVariantClass(variant),
          position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

/**
 * SelectLabel 组件
 */
const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

/**
 * SelectItem 组件
 */
const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    variant?: SelectVisualVariant
  }
>(({ className, children, variant = "default", ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full min-w-0 cursor-pointer select-none items-center",
      "outline-none transition-colors duration-200",
      getSelectItemVariantClass(variant),
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
    >
    <span className={cn(
      "absolute flex h-3.5 w-3.5 items-center justify-center",
      variant === "ghost-pill" ? "left-3.5" : "right-2"
    )}>
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText className="block min-w-0 truncate">{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

/**
 * SelectSeparator 组件
 */
const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border/70", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  COMPACT_FILTER_SELECT_CLASSNAME,
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
