import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { DayPickerProps } from "react-day-picker"
import { zhCN } from "date-fns/locale/zh-CN"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const LazyDayPicker = React.lazy(async () => {
  const module = await import("react-day-picker")
  return { default: module.DayPicker }
})

export type CalendarProps = DayPickerProps

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <React.Suspense
      fallback={
        <div className={cn("p-4 text-sm text-text-muted", className)}>
          日历加载中...
        </div>
      }
    >
      <LazyDayPicker
        locale={zhCN}
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          month_caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          button_previous: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
          ),
          button_next: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
          ),
          month_grid: "w-full border-collapse space-y-1",
          weekdays: "flex",
          weekday: "text-text-muted rounded-md w-8 font-normal text-[0.8rem]",
          week: "flex w-full mt-2",
          day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
          ),
          range_start: "day-range-start",
          range_end: "day-range-end",
          selected:
            "bg-primary-500 text-white hover:bg-primary-600 hover:text-white focus:bg-primary-500 focus:text-white rounded-md",
          today: "bg-muted text-foreground rounded-md",
          outside: "text-text-muted aria-selected:bg-muted aria-selected:text-text-muted",
          disabled: "text-text-muted opacity-50",
          range_middle: "aria-selected:bg-muted aria-selected:text-foreground",
          hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: ({ orientation }) => {
            const Icon = orientation === "left" ? ChevronLeft : ChevronRight
            return <Icon className="h-4 w-4" />
          },
        }}
        {...props}
      />
    </React.Suspense>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
