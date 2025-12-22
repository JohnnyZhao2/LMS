import React from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import { motion } from 'framer-motion';

/**
 * STUDIO BUTTON - REFINED & TACTILE
 * Minimalist design with high-precision interaction feedback.
 */
export interface ButtonProps extends AntButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  pressEffect?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  pressEffect = true,
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

  const Component = pressEffect ? motion.button : 'button';
  
  // We use Ant Button for consistency but wrap or override its behavior
  return (
    <AntButton
      {...props}
      className={className}
      style={{
        ...variantStyles[variant as string],
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
