import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * 圆形头像组件
 *
 * 用于显示用户头像（首字母或图标）的圆形容器
 *
 * @example
 * <AvatarCircle size="md" text="张" />
 * <AvatarCircle size="sm" variant="secondary">
 *   <User className="w-3 h-3" />
 * </AvatarCircle>
 */

const avatarCircleVariants = cva(
  'rounded-full flex items-center justify-center font-semibold transition-transform duration-200',
  {
    variants: {
      size: {
        sm: 'w-6 h-6 text-xs',
        md: 'w-9 h-9 text-sm',
        lg: 'w-16 h-16 text-base',
      },
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary-100 text-secondary',
        muted: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'primary',
    },
  }
);

export interface AvatarCircleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarCircleVariants> {
  /** 显示文本（通常是首字母） */
  text?: string;

  /** 自定义背景色类名（优先级高于 variant） */
  bgColor?: string;

  /** 自定义文字颜色类名（优先级高于 variant） */
  textColor?: string;
}

/**
 * 圆形头像组件
 */
export const AvatarCircle: React.FC<AvatarCircleProps> = ({
  size = 'md',
  variant = 'primary',
  text,
  bgColor,
  textColor,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        avatarCircleVariants({ size, variant }),
        bgColor,
        textColor,
        className
      )}
      {...props}
    >
      {text || children}
    </div>
  );
};
