import { UserAvatar } from '@/components/common/user-avatar';
import {
  SelectableList,
  type SelectableListItem,
} from '@/components/ui/selectable-list';
import type { ComponentProps } from 'react';

export interface UserSelectableListItem extends SelectableListItem {
  avatarKey?: string | null;
}

type SelectableListProps = ComponentProps<typeof SelectableList>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

type UserSelectableListProps = DistributiveOmit<
  SelectableListProps,
  'items' | 'renderLeading' | 'emptyMetaText'
> & { items: UserSelectableListItem[] };

export function UserSelectableList({
  items,
  emptyText = '暂无成员',
  ...props
}: UserSelectableListProps) {
  return (
    <SelectableList
      {...props}
      items={items}
      emptyText={emptyText}
      emptyMetaText="未填写工号"
      renderLeading={(item, { layout }) => {
        const userItem = item as UserSelectableListItem;

        if (layout === 'grid') {
          return (
            <UserAvatar
              avatarKey={userItem.avatarKey}
              name={item.name}
              size="sm"
              className="ring-border/60 mt-0.5 h-7 w-7 shrink-0 ring-1"
            />
          );
        }

        return (
          <UserAvatar
            avatarKey={userItem.avatarKey}
            name={item.name}
            size="md"
            className="h-9 w-9 shrink-0"
          />
        );
      }}
    />
  );
}
