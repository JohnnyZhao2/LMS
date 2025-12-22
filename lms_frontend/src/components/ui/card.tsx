import React from 'react';
import { Card as AntCard } from 'antd';
import type { CardProps as AntCardProps } from 'antd';

/**
 * 增强型卡片组件
 * 基于 design.json 规范，预设圆角、阴影和 Hover 效果
 */
export interface CardProps extends AntCardProps {
  /** 是否启用悬停效果 */
  hoverable?: boolean;
  /** 变体样式 */
  variant?: 'default' | 'bordered' | 'glass';
  /** 是否无内边距 */
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  variant = 'default',
  noPadding = false,
  style,
  className = '',
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)',
    border: 'none',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
    ...(noPadding && { padding: 0 }),
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {},
    bordered: {
      border: '1px solid var(--color-gray-200)',
      boxShadow: 'none',
    },
    glass: {
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      border: 'var(--glass-border)',
    },
  };

  const hoverClassName = hoverable ? 'card-hover' : '';

  return (
    <AntCard
      {...props}
      className={`${className} ${hoverClassName}`.trim()}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </AntCard>
  );
};

export default Card;

