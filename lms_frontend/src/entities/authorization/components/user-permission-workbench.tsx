import { KeyRound } from 'lucide-react';
import { UserAvatar } from '@/entities/user/components/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { UserList as UserDetail } from '@/types/common';
import type { RoleCode } from '@/types/common';
import { UserPermissionSection } from '@/entities/authorization/components/user-permission-section';

interface UserPermissionWorkbenchProps {
  userDetail?: UserDetail;
  selectedRoleCodes: RoleCode[];
  isLoading?: boolean;
  emptyDescription: string;
  metaSuffix?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function UserPermissionWorkbench({
  userDetail,
  selectedRoleCodes,
  isLoading = false,
  emptyDescription,
  metaSuffix,
  headerClassName,
  contentClassName,
}: UserPermissionWorkbenchProps) {
  const headerMeta = [
    userDetail?.employee_id || '未填写工号',
    userDetail?.department?.name,
    metaSuffix,
  ].filter(Boolean).join(' · ');

  return (
    <Spinner spinning={isLoading} className="min-h-0 flex-1">
      {!userDetail ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            icon={KeyRound}
            description={emptyDescription}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={cn('flex shrink-0 items-center gap-4 border-b border-border/60 px-6 py-2', headerClassName)}>
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                avatarKey={userDetail.avatar_key}
                name={userDetail.username}
                size="md"
                className="h-9 w-9 shrink-0"
              />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">{userDetail.username}</h2>
                <p className="truncate text-xs text-text-muted">{headerMeta}</p>
              </div>
            </div>
          </div>

          <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6', contentClassName)}>
            <UserPermissionSection
              key={userDetail.id}
              userId={userDetail.id}
              selectedRoleCodes={selectedRoleCodes}
              isSuperuserAccount={Boolean(userDetail.is_superuser)}
            />
          </div>
        </div>
      )}
    </Spinner>
  );
}
