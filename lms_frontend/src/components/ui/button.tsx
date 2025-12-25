import React from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';

/**
 * STUDIO BUTTON - REFINED & TACTILE
 * Minimalist design with high-precision interaction feedback.
 */
export interface ButtonProps extends Omit<AntButtonProps, 'variant'> {
  btnVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  btnVariant = 'primary',
  style,
  className = '',
  ...props
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-accent)',
      borderColor: 'var(--color-accent)',
      color: '#FFFFFF',
    },
    secondary: {
      backgroundColor: 'var(--color-surface-hover)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-primary)',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: 'var(--color-text-secondary)',
    },
    danger: {
      backgroundColor: 'var(--color-error)',
      borderColor: 'var(--color-error)',
      color: '#FFFFFF',
    },
    link: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: 'var(--color-accent)',
      padding: 0,
      boxShadow: 'none',
    },
  };

  // We use Ant Button for consistency but wrap or override its behavior
  return (
    <AntButton
      {...props}
      className={className}
      style={{
        ...variantStyles[btnVariant as string],
        fontFamily: 'var(--font-body)',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 600,
        transition: 'all var(--transition-fast)',
        ...style,
      }}
    >
      {children}
    </AntButton>
  );
};

export default Button;
