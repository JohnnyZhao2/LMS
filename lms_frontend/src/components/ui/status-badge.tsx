import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 状态徽章类型
 */
export type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'open'
  | 'closed'
  | 'processing'
  | 'default';

/**
 * 状态徽章样式配置
 * 基于 design.json statusBadges 规范
 */
const statusStyles: Record<StatusType, string> = {
  success: 'bg-secondary-50 text-secondary border border-secondary',
  warning: 'bg-warning-50 text-warning-800',
  error: 'bg-destructive-50 text-destructive border border-destructive',
  info: 'bg-primary-50 text-primary border border-primary',
  pending: 'bg-warning-50 text-warning-800',
  open: 'bg-warning-50 text-warning-500 border border-warning-500',
  closed: 'bg-destructive-50 text-destructive border border-destructive',
  processing: 'bg-primary-50 text-primary border border-primary',
  default: 'bg-gray-100 text-gray-700',
};

/**
 * 状态图标映射
 */
const statusIcons: Record<StatusType, React.ReactNode> = {
  success: <CheckCircle className="w-3.5 h-3.5" />,
  warning: <AlertCircle className="w-3.5 h-3.5" />,
  error: <ShieldCheck className="w-3.5 h-3.5" />,
  info: <Info className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  open: <AlertCircle className="w-3.5 h-3.5" />,
  closed: <XCircle className="w-3.5 h-3.5" />,
  processing: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  default: null,
};

export interface StatusBadgeProps {
  /** 状态类型 */
  status: StatusType;
  /** 显示文本 */
  text?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 尺寸 */
  size?: 'small' | 'default';
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 状态徽章组件
 * 基于 design.json statusBadges 规范
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showIcon = true,
  size = 'default',
  className = '',
  style,
}) => {
  const statusClassName = statusStyles[status] || statusStyles.default;
  const icon = statusIcons[status];

  const sizeStyles = {
    small: {
      padding: '4px 8px',
      fontSize: 'var(--font-size-xs)',
      iconSize: 12,
      gap: 4,
    },
    default: {
      padding: '8px 16px',
      fontSize: 'var(--font-size-sm)',
      iconSize: 14,
      gap: 6,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <span
      className={cn(
        statusClassName,
        className
      )}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: currentSize.gap,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        fontWeight: 600,
        lineHeight: 1,
        borderRadius: 'var(--radius-md)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {showIcon && icon && (
        <span style={{ display: 'flex' }}>{icon}</span>
      )}
      {text && <span>{text}</span>}
    </span>
  );
};

export default StatusBadge;
