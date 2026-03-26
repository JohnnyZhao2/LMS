import * as React from 'react'
import { Check } from 'lucide-react'

import { UserAvatar } from '@/components/common/user-avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DEFAULT_AVATAR_OPTIONS,
  type DefaultAvatarKey,
} from '@/features/users/constants/default-avatars'
import { cn } from '@/lib/utils'

interface AvatarPickerPopoverProps {
  avatarKey?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  canEdit?: boolean
  isUpdating?: boolean
  align?: 'start' | 'center' | 'end'
  className?: string
  onSelectAvatar?: (avatarKey: DefaultAvatarKey) => Promise<void> | void
}

export const AvatarPickerPopover: React.FC<AvatarPickerPopoverProps> = ({
  avatarKey,
  name,
  size = 'md',
  canEdit = false,
  isUpdating = false,
  align = 'center',
  className,
  onSelectAvatar,
}) => {
  const [open, setOpen] = React.useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!canEdit || isUpdating) {
      return
    }
    setOpen(nextOpen)
  }

  const handleSelectAvatar = async (nextAvatarKey: DefaultAvatarKey) => {
    if (!onSelectAvatar || isUpdating) {
      return
    }

    if (nextAvatarKey === avatarKey) {
      setOpen(false)
      return
    }

    try {
      await onSelectAvatar(nextAvatarKey)
    } finally {
      setOpen(false)
    }
  }

  const avatarNode = (
    <UserAvatar
      avatarKey={avatarKey}
      name={name}
      size={size}
      interactive={canEdit}
      isPending={isUpdating}
      className={className}
    />
  )

  if (!canEdit) {
    return avatarNode
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`更换 ${name} 的头像`}
          disabled={isUpdating}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {avatarNode}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={10}
        className="w-[288px] rounded-xl border border-border bg-background p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="text-sm font-semibold text-foreground">选择头像</div>
          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_AVATAR_OPTIONS.map((option) => {
              const isActive = option.key === avatarKey

              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={isUpdating}
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleSelectAvatar(option.key)
                  }}
                  className={cn(
                    'relative rounded-full p-0.5 transition-all outline-none',
                    isActive && 'scale-[1.03]',
                    !isUpdating && 'hover:scale-[1.03]',
                  )}
                  aria-label={`选择${option.label}`}
                >
                  <UserAvatar
                    avatarKey={option.key}
                    name={option.label}
                    size="lg"
                    className={cn('mx-auto', isActive && 'shadow-sm')}
                  />
                  {isActive ? (
                    <span className="absolute right-0.5 bottom-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-background bg-foreground text-background shadow-sm">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
