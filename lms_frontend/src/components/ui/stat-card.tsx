import React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    gradient: string;
    delay?: string;
    className?: string;
    trend?: {
        value: string;
        isUp: boolean;
    };
}

/**
 * 统计项卡片组件 - 极致美学版
 */
export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    color,
    gradient,
    delay = '',
    className = '',
    trend,
}) => (
    <Card
        className={cn(
            "reveal-item border-none p-8 relative overflow-hidden group transition-all duration-500",
            delay,
            className
        )}
    >
        {/* 背景装饰球 - Ambient Light Effect */}
        <div
            className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-[0.08] blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"
            style={{ background: color }}
        />

        <div className="flex items-center gap-6 relative z-10">
            <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-clay-btn animate-breathe transition-transform duration-500 group-hover:scale-110"
                style={{ background: gradient }}
            >
                <Icon className="h-8 w-8" />
            </div>

            <div className="flex flex-col">
                <p className="text-xs font-black text-clay-muted uppercase tracking-[0.2em] mb-1 font-display leading-none">
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-clay-foreground tracking-tighter leading-none" style={{ fontFamily: "Nunito, sans-serif" }}>
                        {value}
                    </h3>
                    {trend && (
                        <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full select-none",
                            trend.isUp ? "text-clay-success bg-clay-success/10" : "text-clay-secondary bg-clay-secondary/10"
                        )}>
                            {trend.isUp ? '↑' : '↓'} {trend.value}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </Card>
);
