import * as React from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDefaultAvatarSrc } from '@/entities/user/constants/default-avatars'
import { cn } from '@/lib/utils'

const userAvatarSizeStyles = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-16 w-16 text-lg',
} as const

export interface UserAvatarProps {
  avatarKey?: string | null
  name: string
  size?: keyof typeof userAvatarSizeStyles
  interactive?: boolean
  isPending?: boolean
  className?: string
}

const getAvatarFallbackText = (name: string) => {
  const normalizedName = name.trim()
  if (!normalizedName) {
    return '?'
  }
  return normalizedName.slice(0, 2).toUpperCase()
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarKey,
  name,
  size = 'md',
  interactive = false,
  isPending = false,
  className,
}) => {
  const avatarSrc = getDefaultAvatarSrc(avatarKey)

  return (
    <Avatar
      className={cn(
        'bg-muted text-foreground transition-all',
        userAvatarSizeStyles[size],
        interactive && 'cursor-pointer hover:scale-[1.02]',
        isPending && 'opacity-60 saturate-75',
        className,
      )}
    >
      {avatarSrc ? <AvatarImage src={avatarSrc} alt={`${name} 的头像`} /> : null}
      <AvatarFallback className="bg-muted font-semibold text-foreground">
        {getAvatarFallbackText(name)}
      </AvatarFallback>
    </Avatar>
  )
}
