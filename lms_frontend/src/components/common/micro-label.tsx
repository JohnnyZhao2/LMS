import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * 微标签组件
 *
 * 用于显示小型大写标签文本，常用于表单字段标签、区块标题等
 *
 * @example
 * <MicroLabel>任务标题</MicroLabel>
 * <MicroLabel icon={<FileText className="w-3 h-3" />}>任务描述</MicroLabel>
 */

const microLabelVariants = cva(
  'text-xs font-bold uppercase tracking-widest',
  {
    variants: {
      variant: {
        default: 'text-muted-foreground',
        primary: 'text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface MicroLabelProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof microLabelVariants> {
  /** 图标（可选） */
  icon?: React.ReactNode;

  /** 是否作为 label 元素渲染 */
  asLabel?: boolean;
}

/**
 * 微标签组件
 */
export const MicroLabel: React.FC<MicroLabelProps> = ({
  variant = 'default',
  icon,
  asLabel = false,
  className,
  children,
  ...props
}) => {
  const Component = asLabel ? 'label' : 'div';
  const content = (
    <>
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </>
  );

  if (icon) {
    return (
      <Component
        className={cn(
          microLabelVariants({ variant }),
          'flex items-center gap-2',
          className
        )}
        {...props}
      >
        {content}
      </Component>
    );
  }

  return (
    <Component
      className={cn(microLabelVariants({ variant }), className)}
      {...props}
    >
      {content}
    </Component>
  );
};
