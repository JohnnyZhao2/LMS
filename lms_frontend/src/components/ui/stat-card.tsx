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
            "p-8 relative overflow-hidden group transition-all duration-200 hover:scale-[1.02]",
            delay,
            className
        )}
        style={{ fontFamily: "'Outfit', sans-serif" }}
    >
        {/* Flat Design 背景装饰 */}
        <div
            className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-5 pointer-events-none"
            style={{ background: color }}
        />

        <div className="flex items-center gap-6 relative z-10">
            <div
                className="w-16 h-16 rounded-md flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-110"
                style={{ background: color }}
            >
                <Icon className="h-8 w-8" />
            </div>

            <div className="flex flex-col">
                <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 leading-none">
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-bold text-[#111827] tracking-tight leading-none">
                        {value}
                    </h3>
                    {trend && (
                        <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md select-none border-0 shadow-none",
                            trend.isUp ? "text-[#10B981] bg-[#D1FAE5]" : "text-[#DC2626] bg-[#FEE2E2]"
                        )}>
                            {trend.isUp ? '↑' : '↓'} {trend.value}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </Card>
);
