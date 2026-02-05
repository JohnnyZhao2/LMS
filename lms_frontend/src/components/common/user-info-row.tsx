import * as React from 'react';
import { cn } from '@/lib/utils';
import { AvatarCircle } from './avatar-circle';

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
 *   avatarVariant="primary"
 * />
 */
export interface UserInfoRowProps {
  /** 用户名称 */
  name: string;

  /** 次要信息（如日期、部门等） */
  metadata?: string;

  /** 头像显示文本（通常是首字母） */
  avatarText?: string;

  /** 头像变体样式 */
  avatarVariant?: 'primary' | 'secondary' | 'muted';

  /** 头像尺寸 */
  avatarSize?: 'sm' | 'md' | 'lg';

  /** 自定义类名 */
  className?: string;
}

/**
 * 用户信息行组件
 */
export const UserInfoRow: React.FC<UserInfoRowProps> = ({
  name,
  metadata,
  avatarText,
  avatarVariant = 'muted',
  avatarSize = 'md',
  className,
}) => {
  // 如果没有提供 avatarText，使用 name 的首字母
  const displayAvatarText = avatarText || (name ? name.charAt(0) : 'U');

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <AvatarCircle
        text={displayAvatarText}
        size={avatarSize}
        variant={avatarVariant}
        className="group-hover:scale-110"
      />
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-foreground leading-none mb-1">
          {name}
        </span>
        {metadata && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {metadata}
          </span>
        )}
      </div>
    </div>
  );
};
