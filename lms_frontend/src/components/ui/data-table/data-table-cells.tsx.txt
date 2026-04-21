/**
 * DataTable 共用 Cell 渲染组件
 * 提供统一的表格单元格渲染样式，确保跨页面一致性
 */
import * as React from 'react';
import { UserAvatar } from '@/entities/user/components/user-avatar';
import { formatListDateTime } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import { ListTag } from '@/components/ui/list-tag';

/**
 * Cell 带图标和文字
 * 用于：任务详情、用户信息等需要图标+文本组合的列
 */
interface CellWithIconProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    iconBgClass?: string;
    iconColorClass?: string;
    titleClassName?: string;
    subtitleClassName?: string;
    textWrapClassName?: string;
    className?: string;
}

export const PRIMARY_CELL_TITLE_CLASS =
    'truncate text-sm font-semibold leading-5 text-foreground transition-colors hover:text-primary cursor-pointer';

export const PRIMARY_CELL_TEXT_CLASS =
    'text-sm font-semibold leading-5 text-foreground';

export const PRIMARY_CELL_SUBTITLE_CLASS =
    'truncate text-[11px] font-normal normal-case tracking-normal text-text-muted';

export const CellWithIcon: React.FC<CellWithIconProps> = ({
    icon,
    title,
    subtitle,
    iconBgClass = 'bg-primary-100',
    iconColorClass = 'text-primary',
    titleClassName,
    subtitleClassName,
    textWrapClassName,
    className,
}) => (
    <div className={cn('flex min-w-0 items-center gap-4 py-1', className)}>
        <div
            className={cn(
                'w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform',
                iconBgClass,
                iconColorClass
            )}
        >
            {icon}
        </div>
        <div className={cn('flex min-w-0 flex-col gap-1', textWrapClassName)}>
            <span className={cn(
                PRIMARY_CELL_TITLE_CLASS,
                titleClassName,
            )}>
                {title}
            </span>
            {subtitle && (
                <span className={cn(
                    PRIMARY_CELL_SUBTITLE_CLASS,
                    subtitleClassName,
                )}>
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
    avatar?: React.ReactNode;
    avatarClassName?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const CellWithAvatar: React.FC<CellWithAvatarProps> = ({
    name,
    subtitle,
    avatar,
    avatarClassName = 'bg-primary-100 text-primary',
    size = 'md',
    className,
}) => {
    const sizeStyles = {
        sm: { avatar: 'w-6 h-6', text: 'text-[10px]', wrap: '' },
        md: { avatar: 'w-9 h-9', text: 'text-sm', wrap: '' },
        lg: { avatar: 'w-12 h-12', text: 'text-base', wrap: '' },
    };
    const s = sizeStyles[size];

    return (
        <div className={cn('flex min-w-0 items-center gap-3 py-1', s.wrap, className)}>
            {avatar ? avatar : (
                <div
                    className={cn(
                        s.avatar,
                        'rounded-md flex items-center justify-center flex-shrink-0 font-bold group-hover:scale-110 transition-transform',
                        avatarClassName
                    )}
                >
                    {name?.charAt(0)?.toUpperCase() || '?'}
                </div>
            )}
            <div className="flex min-w-0 flex-col">
                <span className={cn(PRIMARY_CELL_TEXT_CLASS, 'line-clamp-1', s.text)}>
                    {name}
                </span>
                {subtitle && (
                    <span className={PRIMARY_CELL_SUBTITLE_CLASS}>
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
export interface CellTagItem {
    key: string;
    label: React.ReactNode;
    textClass?: string;
    bgClass?: string;
    borderClass?: string;
    className?: string;
}

interface CellTagsProps {
    tags: CellTagItem[];
    className?: string;
    tagClassName?: string;
    tagSize?: 'xs' | 'sm' | 'md';
}

export const CellTags: React.FC<CellTagsProps> = ({ tags, className, tagClassName, tagSize = 'sm' }) => {
    if (tags.length === 0) {
        return <span className="text-[13px] font-medium text-text-muted">—</span>;
    }

    return (
        <div className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
            {tags.map((tag) => (
                <ListTag
                    key={tag.key}
                    size={tagSize}
                    className={cn(
                        'max-w-full bg-primary-50/80',
                        tag.textClass || 'text-text-muted',
                        tag.bgClass,
                        tagClassName,
                        tag.className
                    )}
                >
                    {tag.label}
                </ListTag>
            ))}
        </div>
    );
};

interface CellReferenceTagProps {
    count: number;
    unusedLabel?: string;
    className?: string;
    tagClassName?: string;
}

export const CellReferenceTag: React.FC<CellReferenceTagProps> = ({
    count,
    unusedLabel = '未引用',
    className,
    tagClassName,
}) => (
    <div className={cn('inline-flex', className)}>
        <ListTag
            size="sm"
            className={cn(
                '',
                count > 0
                    ? 'bg-secondary-50 text-text-muted'
                    : 'bg-muted/70 text-text-muted',
                tagClassName,
            )}
        >
            {count > 0 ? (
                <span className="inline-flex items-baseline gap-0.5">
                    <span>{count}</span>
                    <span>次</span>
                </span>
            ) : (
                <span>{unusedLabel}</span>
            )}
        </ListTag>
    </div>
);

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
    <div className={cn('inline-flex', className)}>
        <ListTag
            className={cn(
                '',
                isActive
                    ? 'bg-secondary-50 text-text-muted'
                    : 'bg-muted/70 text-text-muted'
            )}
        >
            {isActive ? activeText : inactiveText}
        </ListTag>
    </div>
);

interface CellMutedTimestampProps {
    icon?: React.ReactNode;
    value?: string | Date | null;
    className?: string;
}

export const CellMutedTimestamp: React.FC<CellMutedTimestampProps> = ({
    icon,
    value,
    className,
}) => (
    <div className={cn('inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-text-muted', className)}>
        {icon ? <span className="text-text-muted">{icon}</span> : null}
        <span className="text-text-muted">
            {formatListDateTime(value)}
        </span>
    </div>
);

/**
 * Cell 小头像 + 名字
 * 用于：导师链接等紧凑型头像显示
 */
interface CellSmallAvatarProps {
    name: string;
    avatarKey?: string | null;
    className?: string;
}

export const CellSmallAvatar: React.FC<CellSmallAvatarProps> = ({
    name,
    avatarKey,
    className,
}) => (
    <div className={cn('inline-flex items-center gap-2 whitespace-nowrap', className)}>
        <UserAvatar avatarKey={avatarKey} name={name} size="sm" />
        <span className="text-[13px] font-medium text-text-muted">{name}</span>
    </div>
);
