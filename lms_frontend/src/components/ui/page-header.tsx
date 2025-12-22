import React from 'react';
import { Breadcrumb, Typography, Space } from 'antd';
import { Link } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

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
        <Breadcrumb
          style={{ marginBottom: 'var(--spacing-3)' }}
          items={[
            {
              title: (
                <Link to="/dashboard">
                  <HomeOutlined />
                </Link>
              ),
            },
            ...breadcrumbs.map((item, index) => ({
              title: item.path ? (
                <Link to={item.path}>
                  <Space size={4}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Space>
                </Link>
              ) : (
                <Space size={4}>
                  {item.icon}
                  <span>{item.title}</span>
                </Space>
              ),
              key: index,
            })),
          ]}
        />
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
          <Title
            level={2}
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
                  fontSize: 20,
                }}
              >
                {icon}
              </span>
            )}
            {title}
          </Title>
          {subtitle && (
            <Text
              type="secondary"
              style={{
                fontSize: 'var(--font-size-base)',
                marginLeft: icon ? 52 : 0,
              }}
            >
              {subtitle}
            </Text>
          )}
        </div>

        {/* 操作区 */}
        {extra && <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;

