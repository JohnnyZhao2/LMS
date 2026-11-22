import { useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { UserSelectList, type UserSelectPanelItem } from '@/components/common/user-select-list';
import { UserAvatar } from '@/components/users/user-avatar';
import { SearchInput } from '@/components/ui/search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import type { RoleCode, UserList } from '@/types/common';
import { cn } from '@/lib/utils';

interface RoleMemberPanelProps {
  roleName: string;
  roleCode: RoleCode;
  roleActive: boolean;
  members: UserList[];
  candidateUsers: UserList[];
  isLoading: boolean;
  canManageMembers: boolean;
  isMutating: boolean;
  mutatingUserId?: number | null;
  onAddMember: (user: UserList) => void | Promise<void>;
  onRemoveMember: (user: UserList) => void | Promise<void>;
}

export const RoleMemberPanel: React.FC<RoleMemberPanelProps> = ({
  roleName,
  roleCode,
  roleActive,
  members,
  candidateUsers,
  isLoading,
  canManageMembers,
  isMutating,
  mutatingUserId,
  onAddMember,
  onRemoveMember,
}) => {
  const { user } = useAuth();
  const isSuperuser = Boolean(user?.is_superuser);
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const canAddInline = canManageMembers && roleActive;

  const filteredCandidateUsers = useMemo(() => {
    const keyword = addSearch.trim().toLowerCase();
    if (!keyword) {
      return candidateUsers;
    }
    return candidateUsers.filter((candidate) => (
      candidate.username.toLowerCase().includes(keyword)
      || candidate.employee_id.toLowerCase().includes(keyword)
    ));
  }, [addSearch, candidateUsers]);

  const candidateItems = useMemo<UserSelectPanelItem[]>(
    () => filteredCandidateUsers.map((candidate) => ({
      id: candidate.id,
      name: candidate.username,
      avatarKey: candidate.avatar_key,
      meta: candidate.department?.name ?? '未分配部门',
      disabled: isMutating,
    })),
    [filteredCandidateUsers, isMutating],
  );

  return (
    <section className="mb-7 border-b border-border/60 pb-6">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[15px] font-semibold text-foreground">角色成员</h3>
        <span className="text-xs font-normal tabular-nums text-slate-400">
          {members.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-1 text-xs text-text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          加载成员中...
        </div>
      ) : members.length === 0 && !canAddInline ? (
        <p className="py-1 text-xs text-text-muted">暂无成员</p>
      ) : (
        <TooltipProvider delayDuration={100} skipDelayDuration={300}>
          <div className="flex flex-wrap items-center gap-2.5">
            {members.map((member) => {
              const canRemoveMember = canManageMembers
                && !member.is_superuser
                && (isSuperuser || member.id !== user?.id);
              const memberTitle = [
                member.username,
                member.department?.name ?? '未分配部门',
                member.employee_id || null,
                !member.is_active ? '已停用' : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <TooltipRoot key={`${roleCode}-${member.id}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'group/pill inline-flex h-7 max-w-full items-center gap-3 rounded-full bg-white py-0.5 pl-2 shadow-[0_2px_10px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_4px_12px_rgba(15,23,42,0.11),0_1px_3px_rgba(15,23,42,0.06)]',
                        canRemoveMember ? 'pr-3.5' : 'pr-4',
                        !member.is_active && 'opacity-65',
                      )}
                    >
                      <UserAvatar
                        avatarKey={member.avatar_key}
                        name={member.username}
                        size="sm"
                        className="h-5 w-5 shrink-0 text-[9px]"
                      />
                      <span
                        className={cn(
                          'truncate text-[12px] font-medium leading-none',
                          member.is_active ? 'text-foreground' : 'text-text-muted',
                        )}
                      >
                        {member.username}
                      </span>
                      {canRemoveMember ? (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => void onRemoveMember(member)}
                          aria-label={`移除 ${member.username}`}
                          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400/80 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                        >
                          {mutatingUserId === member.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" strokeWidth={1.75} />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">{memberTitle}</TooltipContent>
                </TooltipRoot>
              );
            })}

            {canAddInline ? (
              <Popover
                open={addOpen}
                onOpenChange={(open) => {
                  setAddOpen(open);
                  if (!open) {
                    setAddSearch('');
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={isMutating}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100/80 px-3.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    添加成员
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={8}
                  className="w-[320px] rounded-xl border border-slate-200/90 bg-white/98 p-0 shadow-[0_18px_44px_rgba(15,23,42,0.16),0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5 backdrop-blur-sm"
                >
                  <div className="border-b border-border/60 px-3 py-3">
                    <p className="text-sm font-semibold text-foreground">
                      添加到{roleName}
                    </p>
                    <SearchInput
                      value={addSearch}
                      onChange={setAddSearch}
                      placeholder="搜索姓名、工号"
                      className="mt-3"
                      inputClassName="h-9 rounded-lg text-[12px]"
                    />
                  </div>

                  <UserSelectList
                    items={candidateItems}
                    selectedIds={[]}
                    layout="grid"
                    emptyText="没有可添加的用户"
                    className="max-h-[320px] p-2"
                    onSelect={(selectedId) => {
                      const target = filteredCandidateUsers.find((candidate) => candidate.id === selectedId);
                      if (!target) return;
                      void onAddMember(target);
                      setAddOpen(false);
                      setAddSearch('');
                    }}
                  />
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </TooltipProvider>
      )}
    </section>
  );
};
