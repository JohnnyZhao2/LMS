import { UserAvatar } from '@/components/common/user-avatar';
import {
  SelectableList,
  type SelectableListItem,
} from '@/components/ui/selectable-list';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export interface UserSelectPanelItem extends SelectableListItem {
  avatarKey?: string | null;
}

type SelectableListProps = ComponentProps<typeof SelectableList>;

type UserSelectListProps = Omit<SelectableListProps, 'items' | 'renderLeading' | 'emptyMetaText'> & {
  items: UserSelectPanelItem[];
};

export function UserSelectList({
  items,
  emptyText = '暂无成员',
  ...props
}: UserSelectListProps) {
  return (
    <SelectableList
      {...props}
      items={items}
      emptyText={emptyText}
      emptyMetaText="未填写工号"
      renderLeading={(item, { appearance, density, layout }) => {
        const userItem = item as UserSelectPanelItem;
        if (layout === 'grid') {
          return (
            <UserAvatar
              avatarKey={userItem.avatarKey}
              name={item.name}
              size="sm"
              className={cn(
                'mt-0.5 shrink-0 ring-1 ring-border/60',
                density === 'compact' ? 'h-7 w-7' : 'h-8 w-8',
              )}
            />
          );
        }

        return (
          <UserAvatar
            avatarKey={userItem.avatarKey}
            name={item.name}
            size={appearance === 'panel' ? (density === 'compact' ? 'sm' : 'md') : 'sm'}
            className={cn(
              'shrink-0',
              appearance === 'panel' && (density === 'compact' ? 'h-8 w-8' : 'h-9 w-9'),
            )}
          />
        );
      }}
    />
  );
}
