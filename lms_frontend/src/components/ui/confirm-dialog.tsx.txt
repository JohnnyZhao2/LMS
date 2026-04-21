import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { cn } from '@/lib/utils';

/**
 * 确认对话框的属性
 */
export interface ConfirmDialogProps {
  /** 对话框是否打开 */
  open: boolean;
  /** 对话框打开状态改变时的回调 */
  onOpenChange: (open: boolean) => void;
  /** 对话框标题 */
  title: string;
  /** 对话框描述/内容 */
  description: string | React.ReactNode;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 图标背景颜色类名（如 "bg-destructive-100"） */
  iconBgColor?: string;
  /** 图标颜色类名（如 "text-destructive"） */
  iconColor?: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 确认按钮变体 */
  confirmVariant?: 'default' | 'destructive';
  /** 确认按钮的点击处理函数 */
  onConfirm: () => void | Promise<void>;
  /** 是否正在确认中（加载状态） */
  isConfirming?: boolean;
  /** 自定义 DialogContent 类名 */
  contentClassName?: string;
}

/**
 * 确认对话框组件
 * 用于需要用户确认的操作（如删除、重置等）
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'default',
  onConfirm,
  isConfirming = false,
  contentClassName,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md border-0 bg-background px-6 py-7 shadow-2xl sm:px-8 sm:py-8 [&>button]:hidden',
          contentClassName,
        )}
      >
        <div className="flex flex-col items-center text-center">
          <DialogTitle className="text-2xl font-bold text-foreground mb-2 text-center">
            <span
              className="text-2xl leading-none text-foreground sm:text-4xl"
              style={{ fontFamily: "'Georgia', 'Times New Roman', 'PingFang SC', serif" }}
            >
              {title}
            </span>
          </DialogTitle>
          <DialogDescription
            className="mt-3 max-w-md text-base leading-[1.8] text-text-muted sm:text-xl"
            style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
          >
            {description}
          </DialogDescription>

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isConfirming}
            className={cn(
              'mt-8 inline-flex h-10 min-w-40 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold tracking-[0.12em] text-white transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60',
              confirmVariant === 'destructive'
                ? 'bg-destructive hover:bg-destructive'
                : 'bg-foreground hover:bg-foreground/90',
            )}
            style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
          >
            {isConfirming ? '处理中' : confirmText}
          </button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-5 cursor-pointer text-sm font-semibold tracking-[0.08em] text-text-muted transition-colors duration-200 hover:text-foreground/70"
            style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
          >
            {cancelText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
