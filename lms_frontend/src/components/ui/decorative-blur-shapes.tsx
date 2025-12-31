import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 扁平设计装饰性几何形状背景组件
 * 提供扁平风格的几何形状装饰，无模糊效果
 */
interface DecorativeBlurShapesProps {
  /** 形状数量，默认 3-4 个 */
  count?: number;
  /** 颜色变体：primary, secondary, tertiary, mixed */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'mixed';
  /** 自定义类名 */
  className?: string;
  /** 是否启用动画 */
  animated?: boolean;
}

/**
 * 装饰性几何形状背景组件
 * 提供扁平设计风格的几何形状装饰
 */
export const DecorativeBlurShapes: React.FC<DecorativeBlurShapesProps> = ({
  count = 4,
  variant = 'mixed',
  className,
  animated = false,
}) => {
  const shapes = React.useMemo(() => {
    const positions = [
      { top: '-15%', left: '-15%', size: '80vh', delay: 0, shape: 'circle' },
      { bottom: '-15%', right: '-15%', size: '70vh', delay: 200, shape: 'circle' },
      { top: '20%', right: '10%', size: '60vh', delay: 400, shape: 'square' },
      { bottom: '30%', left: '5%', size: '50vh', delay: 600, shape: 'circle' },
    ];

    const getColor = (index: number) => {
      if (variant === 'primary') return 'bg-blue-600/5';
      if (variant === 'secondary') return 'bg-emerald-500/5';
      if (variant === 'tertiary') return 'bg-amber-500/5';
      // mixed: 循环使用不同颜色
      const colors = ['bg-blue-600/5', 'bg-emerald-500/5', 'bg-amber-500/5'];
      return colors[index % colors.length];
    };

    return positions.slice(0, count).map((pos, index) => ({
      ...pos,
      colorClass: getColor(index),
    }));
  }, [count, variant]);

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)} aria-hidden="true">
      {shapes.map((shape, index) => (
        <div
          key={index}
          className={cn(
            shape.colorClass,
            shape.shape === 'circle' ? 'rounded-full' : 'rounded-lg',
            animated && 'animate-pulse'
          )}
          style={{
            ...(shape.top && { top: shape.top }),
            ...(shape.bottom && { bottom: shape.bottom }),
            ...(shape.left && { left: shape.left }),
            ...(shape.right && { right: shape.right }),
            width: shape.size,
            height: shape.size,
            animationDelay: `${shape.delay}ms`,
          }}
        />
      ))}
    </div>
  );
};
