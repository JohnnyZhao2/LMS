/**
 * DataTable 共用 Cell 渲染组件
 * 提供统一的表格单元格渲染样式，确保跨页面一致性
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Cell 带图标和文字
 * 用于：任务详情、用户信息等需要图标+文本组合的列
 */
interface CellWithIconProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    iconBg?: string;
    iconColor?: string;
    className?: string;
}

export const CellWithIcon: React.FC<CellWithIconProps> = ({
    icon,
    title,
    subtitle,
    iconBg = '#DBEAFE',
    iconColor = '#3B82F6',
    className,
}) => (
    <div className={cn('flex items-center gap-4 py-1', className)}>
        <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: iconBg, color: iconColor }}
        >
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="font-bold text-[#111827] hover:text-[#3B82F6] cursor-pointer transition-colors line-clamp-1">
                {title}
            </span>
            {subtitle && (
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
                    {subtitle}
                </span>
            )}
        </div>
    </div>
);

/**
 * Cell 带头像和文字
 * 用于：用户信息、导师信息等需要头像+名字组合的列
 */
interface CellWithAvatarProps {
    name: string;
    subtitle?: string;
    avatarBg?: string;
    avatarColor?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const CellWithAvatar: React.FC<CellWithAvatarProps> = ({
    name,
    subtitle,
    avatarBg = '#DBEAFE',
    avatarColor = '#3B82F6',
    size = 'md',
    className,
}) => {
    const sizeStyles = {
        sm: { avatar: 'w-6 h-6', text: 'text-[10px]', wrap: '' },
        md: { avatar: 'w-10 h-10', text: 'text-sm', wrap: '' },
        lg: { avatar: 'w-12 h-12', text: 'text-base', wrap: '' },
    };
    const s = sizeStyles[size];

    return (
        <div className={cn('flex items-center gap-3 py-1', s.wrap, className)}>
            <div
                className={cn(
                    s.avatar,
                    'rounded-md flex items-center justify-center flex-shrink-0 font-bold group-hover:scale-110 transition-transform'
                )}
                style={{ backgroundColor: avatarBg, color: avatarColor }}
            >
                {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex flex-col">
                <span className={cn('font-bold text-[#111827] line-clamp-1', s.text)}>
                    {name}
                </span>
                {subtitle && (
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Cell 标签列表
 * 用于：角色、资源统计等需要多个标签的列
 */
interface CellTagsProps {
    tags: { key: string; label: string; color?: string; bg?: string }[];
    className?: string;
}

export const CellTags: React.FC<CellTagsProps> = ({ tags, className }) => {
    if (tags.length === 0) {
        return <span className="text-[#9CA3AF] italic text-xs">—</span>;
    }

    return (
        <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
            {tags.map((tag) => (
                <div
                    key={tag.key}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold border-0 shadow-none"
                    style={{
                        backgroundColor: tag.bg || '#DBEAFE',
                        color: tag.color || '#3B82F6',
                    }}
                >
                    {tag.label}
                </div>
            ))}
        </div>
    );
};

/**
 * Cell 状态标签
 * 用于：活跃/已停用、进行中/已结束等状态显示
 */
interface CellStatusProps {
    isActive: boolean;
    activeText?: string;
    inactiveText?: string;
    className?: string;
}

export const CellStatus: React.FC<CellStatusProps> = ({
    isActive,
    activeText = '活跃',
    inactiveText = '已停用',
    className,
}) => (
    <div className={cn('', className)}>
        <Badge
            className={cn(
                'border-0 shadow-none',
                isActive ? 'bg-[#D1FAE5] text-[#10B981]' : 'bg-[#F3F4F6] text-[#6B7280]'
            )}
        >
            {isActive ? activeText : inactiveText}
        </Badge>
    </div>
);

/**
 * Cell 带图标的文字
 * 用于：部门、日期等需要小图标+文字的列
 */
interface CellIconTextProps {
    icon: React.ReactNode;
    text: string;
    className?: string;
}

export const CellIconText: React.FC<CellIconTextProps> = ({
    icon,
    text,
    className,
}) => (
    <div className={cn('flex items-center gap-2', className)}>
        <span className="text-[#9CA3AF]">{icon}</span>
        <span className="text-sm font-medium text-[#111827]">{text}</span>
    </div>
);

/**
 * Cell 小头像 + 名字
 * 用于：导师链接等紧凑型头像显示
 */
interface CellSmallAvatarProps {
    name: string;
    className?: string;
}

export const CellSmallAvatar: React.FC<CellSmallAvatarProps> = ({
    name,
    className,
}) => (
    <div className={cn('flex items-center gap-2', className)}>
        <div className="w-6 h-6 rounded-full bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center text-[10px] font-bold">
            {name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-[#111827]">{name}</span>
    </div>
);
