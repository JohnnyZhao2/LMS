import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 卡片头部组件
 *
 * 用于卡片顶部的状态指示器和操作按钮区域
 *
 * @example
 * <CardHeader
 *   statusDot={<div className="w-2 h-2 rounded-full bg-primary" />}
 *   statusLabel="进行中"
 *   actions={<button>编辑</button>}
 * />
 */
export interface CardHeaderProps {
  /** 状态指示点（可选） */
  statusDot?: React.ReactNode;

  /** 状态标签文本 */
  statusLabel?: string;

  /** 状态标签颜色类名 */
  statusLabelColor?: string;

  /** 右侧操作按钮区域 */
  actions?: React.ReactNode;

  /** 自定义类名 */
  className?: string;
}

/**
 * 卡片头部组件
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  statusDot,
  statusLabel,
  statusLabelColor = 'text-muted-foreground',
  actions,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* 左侧：状态区域 */}
      {(statusDot || statusLabel) && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {statusDot}
            {statusLabel && (
              <span
                className={cn(
                  'text-[11px] font-bold uppercase tracking-wider',
                  statusLabelColor
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 右侧：操作区域 */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
