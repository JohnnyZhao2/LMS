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
    size?: 'sm' | 'lg';
    /** Optional subtitle text */
    subtitle?: string;
    gradient?: string;
    delay?: string;
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
    delay = '',
    className = '',
    trend,
}) => {
    const isLarge = size === 'lg';

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
                isLarge ? "h-36" : "h-28",
                delay,
                className
            )}
        >
            <div className="flex h-full relative z-10">
                {/* Content Zone */}
                <div className="flex-1 flex flex-col justify-between py-5 px-6 relative z-10">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        {/* Glowing LED Indicator */}
                        <div className={cn(
                            "w-1 h-3 rounded-full transition-all duration-500 ease-out group-hover:h-5",
                            accentClassName,
                            "shadow-[0_0_12px_rgba(0,0,0,0.3)]"
                        )}
                        />
                        <p className="font-semibold text-muted-foreground/80 uppercase tracking-widest leading-none text-[10px] truncate group-hover:text-foreground transition-colors duration-300">
                            {title}
                        </p>
                    </div>

                    {/* Value Area */}
                    <div className="flex items-end gap-3 mt-auto transform transition-transform duration-500 group-hover:translate-x-0.5">
                        <h3 className={cn(
                            "font-bold text-foreground tabular-nums leading-none tracking-tight",
                            isLarge ? "text-4xl" : "text-3xl"
                        )}>
                            {value}
                        </h3>

                        <div className="flex flex-col justify-end mb-1">
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
                                <span className="text-xs font-medium text-muted-foreground/60 lowercase mb-0.5 whitespace-nowrap">
                                    {subtitle}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Visual Zone */}
                <div className={cn(
                    "relative h-full flex items-center justify-center overflow-hidden w-32 shrink-0"
                )}>
                    {/* The Icon: Watermark Style - Tinted Lines */}
                    <div className={cn(
                        "absolute -right-6 -bottom-6 w-32 h-32 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] origin-bottom-right",
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
