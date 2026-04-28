import type { LucideIcon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    /** Subject color class (used for decorative elements) */
    accentClassName: string;
    /** Icon color class (default: text-white) */
    iconClassName?: string;
    /** Card size variant */
    size?: 'xs' | 'sm' | 'lg';
    /** Optional subtitle text */
    subtitle?: string;
    className?: string;
    trend?: {
        value: string;
        isUp: boolean;
    };
}

/**
 * Modern "Architectural" StatCard - The "Outfit" Edition
 * Feature: 
 * 1. Numbers now use 'Outfit' font (modern, geometric).
 * 2. Icon lines carry a subtle tint of the accent color.
 */
export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    accentClassName,
    iconClassName, // Optional override
    size = 'lg',
    subtitle,
    className = '',
    trend,
}) => {
    const isLarge = size === 'lg';
    const isCompact = size === 'xs';

    // Heuristic: Try to convert 'bg-blue-500' to 'text-blue-500' 
    const inferredTextColor = accentClassName.replace('bg-', 'text-');

    // Use provided iconClassName OR inferred color OR fallback to text-muted-foreground if all else fails
    // But for the specific design request of "tinted lines", inferredTextColor is the primary strategy unless overridden.
    const finalIconColor = iconClassName || inferredTextColor;

    return (
        <Card
            className={cn(
                "relative overflow-hidden border-border/50 bg-card transition-all duration-500 group hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)]",
                "hover:border-primary/20",
                isLarge ? "h-36" : isCompact ? "h-24" : "h-28",
                className
            )}
        >
            <div className="flex h-full relative z-10">
                {/* Content Zone */}
                <div className={cn(
                    "relative z-10 flex flex-1 flex-col justify-between",
                    isCompact ? "px-4 py-4" : "px-6 py-5",
                )}>
                    {/* Header */}
                    <div className={cn("flex items-center", isCompact ? "gap-2" : "gap-3")}>
                        {/* Glowing LED Indicator */}
                        <div className={cn(
                            "w-1 rounded-full transition-all duration-500 ease-out",
                            isCompact ? "h-2.5 group-hover:h-4" : "h-3 group-hover:h-5",
                            accentClassName,
                            inferredTextColor,
                            "shadow-[0_0_10px_currentColor]"
                        )}
                        />
                        <p className={cn(
                            "truncate font-semibold uppercase leading-none text-muted-foreground/80 transition-colors duration-300 group-hover:text-foreground",
                            isCompact ? "text-[9px] tracking-[0.22em]" : "text-[10px] tracking-widest",
                        )}>
                            {title}
                        </p>
                    </div>

                    {/* Value Area */}
                    <div className={cn(
                        "mt-auto flex items-end transform gap-3 transition-transform duration-500 group-hover:translate-x-0.5",
                        isCompact && "gap-2",
                    )}>
                        <h3 className={cn(
                            "font-bold text-foreground tabular-nums leading-none tracking-tight",
                            isLarge ? "text-4xl" : isCompact ? "text-[1.75rem]" : "text-3xl"
                        )}>
                            {value}
                        </h3>

                        <div className={cn("flex flex-col justify-end", isCompact ? "mb-0.5" : "mb-1")}>
                            {/* Trend/Subtitle */}
                            {trend ? (
                                <div className={cn(
                                    "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded w-fit leading-none select-none transition-colors",
                                    trend.isUp
                                        ? "text-emerald-600 bg-emerald-500/10"
                                        : "text-rose-600 bg-rose-500/10"
                                )}>
                                    <span className="mr-0.5">{trend.isUp ? '↑' : '↓'}</span>
                                    {trend.value}
                                </div>
                            ) : subtitle && (
                                <span className={cn(
                                    "whitespace-nowrap font-medium lowercase text-muted-foreground/60",
                                    isCompact ? "text-[11px]" : "mb-0.5 text-xs",
                                )}>
                                    {subtitle}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Visual Zone */}
                <div className={cn(
                    "relative flex h-full shrink-0 items-center justify-center overflow-hidden",
                    isCompact ? "w-20" : "w-32",
                )}>
                    {/* The Icon: Watermark Style - Tinted Lines */}
                    <div className={cn(
                        "absolute origin-bottom-right transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                        isCompact ? "-bottom-5 -right-5 h-24 w-24" : "-bottom-6 -right-6 h-32 w-32",
                        "group-hover:scale-110 group-hover:-rotate-6 group-hover:-translate-y-2",
                    )}>
                        <Icon
                            className={cn(
                                "w-full h-full",
                                // Use the final calculated color
                                finalIconColor,
                                "opacity-[0.12] group-hover:opacity-[0.2]"
                            )}
                            strokeWidth={0.5}
                        />
                    </div>

                </div>
            </div>
        </Card>
    );
};
