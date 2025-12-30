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
            "reveal-item card-premium border-none p-6 relative overflow-hidden group shadow-sm transition-all duration-500",
            delay,
            className
        )}
    >
        {/* 背景装饰球 */}
        <div
            className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"
            style={{ background: color }}
        />

        <div className="flex items-center gap-5 relative z-10">
            <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"
                style={{ background: gradient }}
            >
                <Icon className="h-7 w-7" />
            </div>

            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1.5">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
                    {trend && (
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                            trend.isUp ? "text-success-600 bg-success-50" : "text-error-600 bg-error-50"
                        )}>
                            {trend.isUp ? '↑' : '↓'} {trend.value}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </Card>
);
