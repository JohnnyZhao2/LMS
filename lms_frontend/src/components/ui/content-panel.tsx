import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 内容面板组件 - Claymorphism 风格
 * 用于页面主内容区域的容器
 */
interface ContentPanelProps {
    /** 子元素 */
    children: React.ReactNode;
    /** 内边距大小 */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** 自定义类名 */
    className?: string;
}

const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

/**
 * 内容面板组件 - Claymorphism 风格
 * 统一的毛玻璃效果 + Clay 阴影 + 圆角
 */
export const ContentPanel: React.FC<ContentPanelProps> = ({
    children,
    padding = 'lg',
    className,
}) => {
    return (
        <div
            className={cn(
                // Flat Design 统一样式
                'bg-white rounded-lg',
                paddingMap[padding],
                className
            )}
        >
            {children}
        </div>
    );
};
