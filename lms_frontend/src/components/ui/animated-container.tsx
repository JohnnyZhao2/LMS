import React, { type ElementType } from 'react';

export type AnimationType =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'scaleIn'
  | 'slideInLeft'
  | 'slideInRight';

export interface AnimatedContainerProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 动画类型 */
  animation?: AnimationType;
  /** 延迟 (ms) */
  delay?: number;
  /** 持续时间 */
  duration?: 'fast' | 'base' | 'slow';
  /** 是否启用动画 */
  enabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** HTML 标签 */
  as?: ElementType;
}

const durationMap = {
  fast: '0.15s',
  base: '0.2s',
  slow: '0.3s',
};

/**
 * 动画容器组件
 * 用于为内容添加入场动画
 */
export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 'slow',
  enabled = true,
  className = '',
  style,
  as: Component = 'div',
}) => {
  if (!enabled) {
    return (
      <Component className={className} style={style}>
        {children}
      </Component>
    );
  }

  const animationClass = `animate-${animation}`;

  return (
    <Component
      className={`${className} ${animationClass}`}
      style={{
        animationDuration: durationMap[duration],
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
        ...style,
      }}
    >
      {children}
    </Component>
  );
};

/**
 * 交错动画列表
 * 为列表中的每个子元素添加交错动画
 */
export interface StaggeredListProps {
  /** 子元素数组 */
  children: React.ReactNode[];
  /** 动画类型 */
  animation?: AnimationType;
  /** 每个元素之间的延迟间隔 (ms) */
  staggerDelay?: number;
  /** 初始延迟 (ms) */
  initialDelay?: number;
  /** 是否启用动画 */
  enabled?: boolean;
  /** 容器类名 */
  className?: string;
  /** 容器样式 */
  style?: React.CSSProperties;
  /** 子元素包装器类名 */
  itemClassName?: string;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  animation = 'fadeInUp',
  staggerDelay = 50,
  initialDelay = 0,
  enabled = true,
  className = '',
  style,
  itemClassName = '',
}) => {
  return (
    <div className={className} style={style}>
      {React.Children.map(children, (child, index) => (
        <AnimatedContainer
          key={index}
          animation={animation}
          delay={initialDelay + index * staggerDelay}
          enabled={enabled}
          className={itemClassName}
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  );
};

export default AnimatedContainer;

