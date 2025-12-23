import React from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';

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
const statusStyles: Record<StatusType, { bg: string; color: string; border: string }> = {
  success: {
    bg: 'var(--color-success-50)',
    color: 'var(--color-success-600)',
    border: 'none',
  },
  warning: {
    bg: 'var(--color-warning-50)',
    color: '#8B7000',
    border: 'none',
  },
  error: {
    bg: 'var(--color-error-50)',
    color: 'var(--color-error-600)',
    border: 'none',
  },
  info: {
    bg: 'var(--color-primary-50)',
    color: 'var(--color-primary-600)',
    border: 'none',
  },
  pending: {
    bg: 'var(--color-warning-50)',
    color: '#8B7000',
    border: 'none',
  },
  open: {
    bg: '#FFF4ED',
    color: 'var(--color-orange-600)',
    border: 'none',
  },
  closed: {
    bg: 'var(--color-error-50)',
    color: 'var(--color-error-600)',
    border: 'none',
  },
  processing: {
    bg: 'var(--color-primary-50)',
    color: 'var(--color-primary-600)',
    border: 'none',
  },
  default: {
    bg: 'var(--color-gray-100)',
    color: 'var(--color-gray-700)',
    border: 'none',
  },
};

/**
 * 状态图标映射
 */
const statusIcons: Record<StatusType, React.ReactNode> = {
  success: <CheckCircleOutlined />,
  warning: <ExclamationCircleOutlined />,
  error: <CloseCircleOutlined />,
  info: <InfoCircleOutlined />,
  pending: <ClockCircleOutlined />,
  open: <ExclamationCircleOutlined />,
  closed: <CloseCircleOutlined />,
  processing: <SyncOutlined spin />,
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
  const styles = statusStyles[status] || statusStyles.default;
  const icon = statusIcons[status];

  const sizeStyles = {
    small: {
      padding: '4px 8px',
      fontSize: 'var(--font-size-xs)',
      iconSize: 12,
      gap: 4,
    },
    default: {
      padding: '6px 12px',
      fontSize: 'var(--font-size-sm)',
      iconSize: 14,
      gap: 6,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: currentSize.gap,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        fontWeight: 500,
        lineHeight: 1,
        borderRadius: 'var(--radius-full)',
        background: styles.bg,
        color: styles.color,
        border: styles.border,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {showIcon && icon && (
        <span style={{ display: 'flex', fontSize: currentSize.iconSize }}>{icon}</span>
      )}
      {text && <span>{text}</span>}
    </span>
  );
};

export default StatusBadge;

