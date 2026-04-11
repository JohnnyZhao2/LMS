import { format } from "date-fns"
import { zhCN } from "date-fns/locale/zh-CN"
import { CalendarIcon, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
}

const DATE_PICKER_TRIGGER_CLASSNAME = [
  "h-11 w-full justify-between rounded-xl border-border/60",
  "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]",
  "px-3.5 text-left text-[13px] font-medium shadow-none",
  "hover:border-interaction-border hover:bg-white",
].join(" ")

const DATE_PICKER_CONTENT_CLASSNAME = [
  "w-auto rounded-[22px] border-border/70 p-2",
  "bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(248,250,252,0.96))]",
  "shadow-[0_24px_64px_rgba(15,23,42,0.16)]",
].join(" ")

function DatePicker({
  date,
  onDateChange,
  placeholder = "选择日期",
  className,
  align = "start",
  disabled = false,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            DATE_PICKER_TRIGGER_CLASSNAME,
            !date && "text-text-muted",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <CalendarIcon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">
              {date ? format(date, "yyyy.MM.dd", { locale: zhCN }) : placeholder}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
        </Button>
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
}

function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "选择日期范围",
  className,
  align = "start",
  disabled = false,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            DATE_PICKER_TRIGGER_CLASSNAME,
            !dateRange?.from && "text-text-muted",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <CalendarIcon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">
              {dateRange?.from ? (
                dateRange.to ? (
                  `${format(dateRange.from, "yyyy.MM.dd", { locale: zhCN })} - ${format(dateRange.to, "yyyy.MM.dd", { locale: zhCN })}`
                ) : (
                  format(dateRange.from, "yyyy.MM.dd", { locale: zhCN })
                )
              ) : (
                placeholder
              )}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
        </Button>
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
