import type { LucideIcon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { IconBox } from '@/components/common';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    /** 主题色类名（用于图标背景） */
    accentClassName: string;
    /** 图标颜色类名（默认为 text-white） */
    iconClassName?: string;
    /** 卡片尺寸 */
    size?: 'sm' | 'lg';
    /** 副标题 */
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
 * 统计项卡片组件 - 支持两种尺寸
 *
 * @example
 * // 大尺寸（默认）- 用于仪表板
 * <StatCard title="用户总数" value={1000} icon={Users} accentClassName="bg-primary" />
 *
 * // 小尺寸 - 用于 KPI 监控
 * <StatCard title="完成人数" value="10/20" subtitle="50%" icon={Users} accentClassName="bg-primary-50" iconClassName="text-primary" size="sm" />
 */
export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    accentClassName,
    iconClassName = 'text-white',
    size = 'lg',
    subtitle,
    delay = '',
    className = '',
    trend,
}) => {
    const isLarge = size === 'lg';

    return (
        <Card
            className={cn(
                "relative overflow-hidden group transition-all duration-200 hover:scale-[1.02]",
                isLarge ? "p-8" : "p-5",
                delay,
                className
            )}
            style={{ fontFamily: "'Outfit', sans-serif" }}
        >
            {/* Flat Design 背景装饰 - 仅大尺寸显示 */}
            {isLarge && (
                <div
                    className={cn(
                        "absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-5 pointer-events-none",
                        accentClassName
                    )}
                />
            )}

            <div className={cn("flex items-center relative z-10", isLarge ? "gap-6" : "gap-4")}>
                <IconBox
                    icon={icon}
                    size={isLarge ? 'xl' : 'md'}
                    bgColor={accentClassName}
                    iconColor={iconClassName}
                    rounded={isLarge ? 'md' : 'xl'}
                />

                <div className="flex flex-col min-w-0 flex-1">
                    <p className={cn(
                        "font-bold text-muted uppercase tracking-wider leading-none",
                        isLarge ? "text-xs mb-1" : "text-xs truncate"
                    )}>
                        {title}
                    </p>
                    <div className={cn("flex items-baseline gap-2", isLarge ? "" : "mt-0.5")}>
                        <h3 className={cn(
                            "font-bold text-foreground tracking-tight leading-none tabular-nums",
                            isLarge ? "text-4xl" : "text-2xl"
                        )}>
                            {value}
                        </h3>
                        {subtitle && (
                            <span className="text-sm text-muted">{subtitle}</span>
                        )}
                        {trend && (
                            <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md select-none border-0",
                                trend.isUp ? "text-secondary bg-secondary-100" : "text-destructive bg-destructive-100"
                            )}>
                                {trend.isUp ? '↑' : '↓'} {trend.value}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};
