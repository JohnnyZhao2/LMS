import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * SegmentedControl 组件 - Flat Design 分段式选择器
 * 
 * 设计规范：
 * - 无阴影
 * - 实心背景色切换
 * - hover:scale-105 交互反馈
 * - rounded-md 圆角
 */

interface SegmentedControlOption {
    value: string
    label: string
    icon?: React.ReactNode
}

interface SegmentedControlProps {
    options: SegmentedControlOption[]
    value: string
    onChange: (value: string) => void
    className?: string
    size?: "sm" | "default" | "lg"
}

const sizeStyles = {
    sm: "h-10 px-4 text-sm",
    default: "h-12 px-6 text-base",
    lg: "h-14 px-8 text-lg",
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
    options,
    value,
    onChange,
    className,
    size = "default",
}) => {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg",
                className
            )}
        >
            {options.map((option) => {
                const isSelected = option.value === value
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all duration-200",
                            sizeStyles[size],
                            isSelected
                                ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                                : "bg-transparent text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]",
                            "hover:scale-105 active:scale-95"
                        )}
                    >
                        {option.icon && <span className="[&_svg]:w-4 [&_svg]:h-4">{option.icon}</span>}
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

/**
 * SegmentedControlItem - 色块式分段按钮（用于更强调的场景）
 * 
 * 使用不同背景色区分选项，适合 dashboard 等场景
 */
interface ColorSegmentOption extends SegmentedControlOption {
    color?: "primary" | "secondary" | "accent" | "muted"
}

interface ColorSegmentedControlProps {
    options: ColorSegmentOption[]
    value: string
    onChange: (value: string) => void
    className?: string
}

const colorStyles = {
    primary: {
        active: "bg-[#3B82F6] text-white",
        inactive: "bg-[#DBEAFE] text-[#3B82F6]",
    },
    secondary: {
        active: "bg-[#10B981] text-white",
        inactive: "bg-[#D1FAE5] text-[#10B981]",
    },
    accent: {
        active: "bg-[#F59E0B] text-white",
        inactive: "bg-[#FEF3C7] text-[#F59E0B]",
    },
    muted: {
        active: "bg-[#111827] text-white",
        inactive: "bg-[#F3F4F6] text-[#6B7280]",
    },
}

export const ColorSegmentedControl: React.FC<ColorSegmentedControlProps> = ({
    options,
    value,
    onChange,
    className,
}) => {
    return (
        <div className={cn("inline-flex items-center gap-2", className)}>
            {options.map((option) => {
                const isSelected = option.value === value
                const color = option.color || "primary"
                const styles = colorStyles[color]

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "inline-flex items-center justify-center gap-2 h-12 px-6 font-semibold rounded-md transition-all duration-200",
                            isSelected ? styles.active : styles.inactive,
                            "hover:scale-105 active:scale-95"
                        )}
                    >
                        {option.icon && <span className="[&_svg]:w-4 [&_svg]:h-4">{option.icon}</span>}
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
