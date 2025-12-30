import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 副标题/描述 */
  subtitle?: string;
  /** 面包屑导航 */
  breadcrumbs?: BreadcrumbItem[];
  /** 右侧操作区 */
  extra?: React.ReactNode;
  /** 标题前的图标 */
  icon?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否显示动画 */
  animated?: boolean;
}

/**
 * 页面头部组件
 * 包含标题、副标题、面包屑和操作区
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  extra,
  icon,
  className = '',
  animated = true,
}) => {
  const animationClass = animated ? 'animate-fadeInDown' : '';

  return (
    <div
      className={`${className} ${animationClass}`}
      style={{
        marginBottom: 'var(--spacing-6)',
      }}
    >
      {/* 面包屑 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="flex items-center gap-2 text-sm"
          style={{ marginBottom: 'var(--spacing-3)' }}
        >
          <Link to="/dashboard" className="text-gray-500 hover:text-primary-500 transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              {item.path ? (
                <Link
                  to={item.path}
                  className="flex items-center gap-1 text-gray-500 hover:text-primary-500 transition-colors"
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-gray-700">
                  {item.icon}
                  <span>{item.title}</span>
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* 标题区域 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--spacing-4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              marginBottom: subtitle ? 'var(--spacing-1)' : 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3)',
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 'var(--font-weight-bold)',
            }}
          >
            {icon && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-500)',
                }}
              >
                {icon}
              </span>
            )}
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-base)',
                marginLeft: icon ? 52 : 0,
                color: 'var(--color-gray-500)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* 操作区 */}
        {extra && <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;

