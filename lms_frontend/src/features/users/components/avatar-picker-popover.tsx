import * as React from 'react'
import { Check } from 'lucide-react'

import { UserAvatar } from '@/components/common/user-avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AVATAR_CATEGORIES } from '@/features/users/constants/default-avatars'
import { cn } from '@/lib/utils'

interface AvatarPickerPopoverProps {
  avatarKey?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  canEdit?: boolean
  isUpdating?: boolean
  align?: 'start' | 'center' | 'end'
  className?: string
  onSelectAvatar?: (avatarKey: string) => Promise<void> | void
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

  const handleSelectAvatar = async (nextAvatarKey: string) => {
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
        className="w-[320px] rounded-xl border border-border bg-background p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="text-sm font-semibold text-foreground">选择头像</div>
          <Tabs defaultValue={AVATAR_CATEGORIES[0].id} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-9">
              {AVATAR_CATEGORIES.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="text-xs px-2"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {AVATAR_CATEGORIES.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-3">
                <div className="grid max-h-[280px] grid-cols-4 justify-items-center gap-2 overflow-x-hidden overflow-y-auto py-1">
                  {category.avatars.map((option) => {
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
                        className="relative flex h-12 w-12 items-center justify-center rounded-full p-0.5 outline-none"
                        aria-label={`选择${option.label}`}
                      >
                        <span
                          className={cn(
                            'inline-flex transition-transform duration-150',
                            isActive && 'scale-[1.03]',
                            !isUpdating && 'hover:scale-[1.03]',
                          )}
                        >
                          <UserAvatar
                            avatarKey={option.key}
                            name={option.label}
                            size="lg"
                            className={cn('mx-auto', isActive && 'shadow-sm')}
                          />
                        </span>
                        {isActive ? (
                          <span className="absolute right-0.5 bottom-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-background bg-foreground text-background shadow-sm">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  )
}
