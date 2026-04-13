import { format } from "date-fns"
import { zhCN } from "date-fns/locale/zh-CN"
import { CalendarIcon, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { QUIET_OUTLINE_FIELD_CLASSNAME } from "@/components/ui/interactive-styles"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  align?: "start" | "center" | "end"
  disabled?: boolean
  appearance?: "default" | "search"
}

const DATE_PICKER_TRIGGER_CLASSNAME = [
  "flex h-10 w-full items-center justify-between rounded-lg px-3.5 text-left text-[12px] font-medium text-foreground",
  QUIET_OUTLINE_FIELD_CLASSNAME,
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

const DATE_PICKER_CONTENT_CLASSNAME = [
  "w-auto rounded-xl border border-border/70 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]",
].join(" ")

const DATE_PICKER_SEARCH_TRIGGER_CLASSNAME = [
  "flex h-11 w-full items-center justify-between rounded-xl border border-border/60 bg-background px-3.5 text-left text-[13px] font-medium text-foreground shadow-none transition-all duration-300",
  "hover:border-interaction-border hover:bg-background hover:shadow-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

function DatePicker({
  date,
  onDateChange,
  placeholder = "选择日期",
  className,
  align = "start",
  disabled = false,
  appearance = "default",
}: DatePickerProps) {
  const dateLabel = date ? format(date, "yyyy.MM.dd", { locale: zhCN }) : placeholder

  return (
    <Popover>
      <PopoverTrigger asChild>
        {appearance === "search" ? (
          <button
            type="button"
            disabled={disabled}
            className={cn(
              DATE_PICKER_SEARCH_TRIGGER_CLASSNAME,
              !date && "text-text-muted",
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">{dateLabel}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={cn(
              DATE_PICKER_TRIGGER_CLASSNAME,
              !date && "text-text-muted",
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">{dateLabel}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className={DATE_PICKER_CONTENT_CLASSNAME} align={align} sideOffset={8}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  align?: "start" | "center" | "end"
  disabled?: boolean
  appearance?: "default" | "search"
}

function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "选择日期范围",
  className,
  align = "start",
  disabled = false,
  appearance = "default",
}: DateRangePickerProps) {
  const rangeLabel = dateRange?.from
    ? (
      dateRange.to
        ? `${format(dateRange.from, "yyyy.MM.dd", { locale: zhCN })} - ${format(dateRange.to, "yyyy.MM.dd", { locale: zhCN })}`
        : format(dateRange.from, "yyyy.MM.dd", { locale: zhCN })
    )
    : placeholder

  return (
    <Popover>
      <PopoverTrigger asChild>
        {appearance === "search" ? (
          <button
            type="button"
            disabled={disabled}
            className={cn(
              DATE_PICKER_SEARCH_TRIGGER_CLASSNAME,
              !dateRange?.from && "text-text-muted",
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">{rangeLabel}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={cn(
              DATE_PICKER_TRIGGER_CLASSNAME,
              !dateRange?.from && "text-text-muted",
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">{rangeLabel}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className={DATE_PICKER_CONTENT_CLASSNAME} align={align} sideOffset={8}>
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, DateRangePicker }
