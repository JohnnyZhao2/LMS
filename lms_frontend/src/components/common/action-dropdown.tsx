import * as React from 'react';
import { MoreVertical, MoreHorizontal, type LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * 操作下拉菜单组件
 *
 * 统一的操作菜单，支持自定义触发器和菜单项
 *
 * @example
 * <ActionDropdown
 *   items={[
 *     { icon: Pencil, label: '编辑', onClick: handleEdit },
 *     { icon: Trash, label: '删除', onClick: handleDelete, variant: 'destructive' },
 *   ]}
 * />
 */

export interface ActionDropdownItem {
  /** 图标 */
  icon?: LucideIcon;
  /** 标签文本 */
  label: string;
  /** 点击事件 */
  onClick: () => void;
  /** 变体样式 */
  variant?: 'default' | 'destructive';
  /** 是否禁用 */
  disabled?: boolean;
}

export interface ActionDropdownProps {
  /** 菜单项列表 */
  items: ActionDropdownItem[];
  /** 触发器图标 */
  triggerIcon?: LucideIcon;
  /** 菜单标题 */
  label?: string;
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end';
  /** 触发器大小 */
  triggerSize?: 'sm' | 'md';
  /** 自定义触发器类名 */
  triggerClassName?: string;
}

/**
 * 操作下拉菜单组件
 */
export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  items,
  triggerIcon: TriggerIcon = MoreVertical,
  label,
  align = 'end',
  triggerSize = 'md',
  triggerClassName,
}) => {
  const triggerSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
  };

  const iconSizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors',
            triggerSizeClasses[triggerSize],
            triggerClassName
          )}
        >
          <TriggerIcon className={iconSizeClasses[triggerSize]} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-48 rounded-xl p-2 border border-border bg-background"
      >
        {label && (
          <>
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-2">
              {label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={index}
              className={cn(
                'rounded-lg px-3 py-2.5 font-semibold cursor-pointer',
                item.variant === 'destructive'
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'hover:bg-muted'
              )}
              onClick={item.onClick}
              disabled={item.disabled}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
