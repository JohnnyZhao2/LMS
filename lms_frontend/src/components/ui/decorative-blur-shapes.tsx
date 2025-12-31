import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Material You 装饰性模糊形状背景组件
 * 可复用的多层模糊形状装饰，用于创建大气背景和视觉深度
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
 * 装饰性模糊形状背景组件
 * 提供 Material You 风格的有机模糊形状装饰
 */
export const DecorativeBlurShapes: React.FC<DecorativeBlurShapesProps> = ({
  count = 4,
  variant = 'mixed',
  className,
  animated = false,
}) => {
  const shapes = React.useMemo(() => {
    const positions = [
      { top: '-15%', left: '-15%', size: '80vh', delay: 0 },
      { bottom: '-15%', right: '-15%', size: '70vh', delay: 200 },
      { top: '20%', right: '10%', size: '60vh', delay: 400 },
      { bottom: '30%', left: '5%', size: '50vh', delay: 600 },
      { top: '50%', left: '50%', size: '100vh', delay: 0 }, // 中心光晕
    ];

    const getColorClass = (index: number) => {
      if (variant === 'primary') return 'blur-shape-primary';
      if (variant === 'secondary') return 'blur-shape-secondary';
      if (variant === 'tertiary') return 'blur-shape-tertiary';
      // mixed: 循环使用不同颜色
      const colors = ['blur-shape-primary', 'blur-shape-secondary', 'blur-shape-tertiary'];
      return colors[index % colors.length];
    };

    return positions.slice(0, count).map((pos, index) => ({
      ...pos,
      colorClass: index === count - 1 ? 'atmospheric-glow' : getColorClass(index),
      opacity: index === count - 1 ? 1 : (index < 2 ? 1 : 0.7),
    }));
  }, [count, variant]);

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)} aria-hidden="true">
      {shapes.map((shape, index) => (
        <div
          key={index}
          className={cn(
            shape.colorClass,
            animated && 'animate-pulse',
            index === shapes.length - 1 && '-translate-x-1/2 -translate-y-1/2'
          )}
          style={{
            ...(shape.top && { top: shape.top }),
            ...(shape.bottom && { bottom: shape.bottom }),
            ...(shape.left && { left: shape.left }),
            ...(shape.right && { right: shape.right }),
            width: shape.size,
            height: shape.size,
            opacity: shape.opacity,
            animationDelay: `${shape.delay}ms`,
          }}
        />
      ))}
    </div>
  );
};
