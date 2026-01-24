import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 用户信息行组件
 *
 * 显示用户头像（或首字母）和相关信息的横向布局
 *
 * @example
 * <UserInfoRow
 *   name="张三"
 *   metadata="2024.01.20"
 *   avatarText="张"
 * />
 *
 * @example
 * <UserInfoRow
 *   name="李四"
 *   metadata="工号: 12345 · 技术部"
 *   avatarBgColor="bg-primary-100"
 *   avatarTextColor="text-primary-700"
 * />
 */
export interface UserInfoRowProps {
  /** 用户名称 */
  name: string;

  /** 次要信息（如日期、部门等） */
  metadata?: string;

  /** 头像显示文本（通常是首字母） */
  avatarText?: string;

  /** 头像背景色类名 */
  avatarBgColor?: string;

  /** 头像文字颜色类名 */
  avatarTextColor?: string;

  /** 头像尺寸 */
  avatarSize?: 'sm' | 'md' | 'lg';

  /** 自定义类名 */
  className?: string;
}

const avatarSizeConfig = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

/**
 * 用户信息行组件
 */
export const UserInfoRow: React.FC<UserInfoRowProps> = ({
  name,
  metadata,
  avatarText,
  avatarBgColor = 'bg-gray-100',
  avatarTextColor = 'text-gray-600',
  avatarSize = 'md',
  className,
}) => {
  // 如果没有提供 avatarText，使用 name 的首字母
  const displayAvatarText = avatarText || (name ? name.charAt(0) : 'U');

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-md flex items-center justify-center font-bold transition-transform duration-200 group-hover:scale-110',
          avatarSizeConfig[avatarSize],
          avatarBgColor,
          avatarTextColor
        )}
      >
        {displayAvatarText}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-gray-900 leading-none mb-1">
          {name}
        </span>
        {metadata && (
          <span className="text-[10px] font-medium text-gray-500">
            {metadata}
          </span>
        )}
      </div>
    </div>
  );
};
