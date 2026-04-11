import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"
import { zhCN } from "date-fns/locale/zh-CN"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = DayPickerProps

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={zhCN}
      navLayout="around"
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row sm:gap-4",
        month: "relative space-y-4",
        month_caption: "relative flex h-8 items-center justify-center px-10",
        caption_label: "text-sm font-semibold tracking-[0.01em] text-foreground",
        nav: "contents",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-0 top-0 h-8 w-8 rounded-xl border-border/60 bg-white/80 p-0 shadow-none hover:border-primary-200 hover:bg-primary-50/70"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-0 top-0 h-8 w-8 rounded-xl border-border/60 bg-white/80 p-0 shadow-none hover:border-primary-200 hover:bg-primary-50/70"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "mb-1 flex",
        weekday: "w-9 rounded-md text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm text-foreground focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-xl border-none bg-transparent p-0 text-[13px] font-medium text-foreground shadow-none transition-[background-color,color,transform] duration-150 hover:bg-primary-50 hover:text-primary aria-selected:opacity-100"
        ),
        selected:
          "[&>.rdp-day_button]:bg-primary-500 [&>.rdp-day_button]:text-white [&>.rdp-day_button]:shadow-[0_10px_22px_rgba(37,99,235,0.18)] [&>.rdp-day_button]:hover:bg-primary-600 [&>.rdp-day_button]:hover:text-white [&>.rdp-day_button]:focus:bg-primary-500 [&>.rdp-day_button]:focus:text-white",
        today: "[&>.rdp-day_button]:bg-muted [&>.rdp-day_button]:text-foreground",
        outside: "text-text-muted/70 aria-selected:bg-primary-50/60 aria-selected:text-text-muted",
        disabled: "text-text-muted opacity-35",
        range_start: "rounded-l-[18px] bg-primary-50/90",
        range_end: "rounded-r-[18px] bg-primary-50/90",
        range_middle: "bg-primary-50/75 text-primary [&>.rdp-day_button]:rounded-none [&>.rdp-day_button]:bg-transparent [&>.rdp-day_button]:text-primary [&>.rdp-day_button]:shadow-none hover:[&>.rdp-day_button]:bg-primary-50/40",
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
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
