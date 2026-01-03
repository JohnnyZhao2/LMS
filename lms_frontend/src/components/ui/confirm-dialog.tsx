import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { Button } from './button';

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
  /** 图标背景颜色类名（如 "bg-[#FEE2E2]"） */
  iconBgColor?: string;
  /** 图标颜色类名（如 "text-[#DC2626]"） */
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
  icon,
  iconBgColor = 'bg-[#DBEAFE]',
  iconColor = 'text-[#3B82F6]',
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

  const defaultContentClassName = 'rounded-lg max-w-md p-10 border-0 bg-white shadow-none';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName || defaultContentClassName}>
        <DialogHeader>
          {icon && (
            <div className={`w-20 h-20 ${iconBgColor} ${iconColor} rounded-lg flex items-center justify-center mb-8 mx-auto`}>
              {icon}
            </div>
          )}
          <DialogTitle className="text-2xl font-bold text-[#111827] mb-2 text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[#6B7280] font-medium text-center leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-10 gap-4 sm:flex-row">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-md h-14 font-semibold text-[#6B7280] hover:bg-[#F3F4F6] shadow-none"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            variant={confirmVariant === 'destructive' ? 'destructive' : 'default'}
            className={`flex-1 text-white rounded-md h-14 font-semibold shadow-none hover:scale-105 transition-all duration-200 ${
              confirmVariant === 'destructive'
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#111827] hover:bg-[#374151]'
            }`}
          >
            {isConfirming ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
