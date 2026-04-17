import { useMemo, useState } from 'react';
import { Loader2, Plus, Search, UserPlus, X } from 'lucide-react';
import { ROLE_FULL_LABELS } from '@/config/role-constants';
import { UserAvatar } from '@/components/common/user-avatar';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { RoleCode, UserList } from '@/types/common';
import { ASSIGNABLE_ROLES } from '@/lib/role-config';
import { cn } from '@/lib/utils';

interface RoleTemplateMemberPanelProps {
  activeRole: RoleCode;
  search: string;
  onSearchChange: (value: string) => void;
  membersByRole: Partial<Record<RoleCode, UserList[]>>;
  candidateUsers: UserList[];
  isLoading: boolean;
  canManageMembers: boolean;
  isMutating: boolean;
  mutatingUserId?: number | null;
  onAddMember: (user: UserList) => void | Promise<void>;
  onRemoveMember: (user: UserList) => void | Promise<void>;
  selectedMemberId?: number | null;
  onSelectMember?: (user: UserList) => void;
  canSelectMember?: boolean;
}

const renderMemberCard = ({
  member,
  selectedMemberId,
  canSelectMember,
  canManageMembers,
  isMutating,
  mutatingUserId,
  onSelectMember,
  onRemoveMember,
  muted = false,
}: {
  member: UserList;
  selectedMemberId?: number | null;
  canSelectMember: boolean;
  canManageMembers: boolean;
  isMutating: boolean;
  mutatingUserId?: number | null;
  onSelectMember?: (user: UserList) => void;
  onRemoveMember: (user: UserList) => void | Promise<void>;
  muted?: boolean;
}) => (
  <div
    key={member.id}
    role={canSelectMember ? 'button' : undefined}
    tabIndex={canSelectMember ? 0 : undefined}
    onClick={() => {
      if (!canSelectMember || !onSelectMember) {
        return;
      }
      onSelectMember(member);
    }}
    onKeyDown={(event) => {
      if (!canSelectMember || !onSelectMember) {
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      onSelectMember(member);
    }}
    className={cn(
      'group relative flex min-h-[62px] w-full items-center gap-2 overflow-visible rounded-xl border px-2 py-2',
      selectedMemberId === member.id
        ? 'border-primary/50 bg-primary/[0.05] shadow-[inset_0_0_0_1px_rgba(14,165,233,0.16)]'
        : 'border-border/70 bg-white',
      muted && 'bg-slate-50/80',
      canSelectMember
        ? 'cursor-pointer transition-colors duration-200 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
        : '',
    )}
    title={`${member.username}${member.department?.name ? ` · ${member.department.name}` : ''}`}
  >
    <UserAvatar
      avatarKey={member.avatar_key}
      name={member.username}
      size="sm"
      className="h-6.5 w-6.5 shrink-0"
    />
    <div className="min-w-0 flex-1 pr-3">
      <p className="truncate text-[12px] font-medium leading-5 text-foreground">
        {member.username}
      </p>
      <p className="truncate text-[10.5px] leading-4 text-text-muted">
        {member.department?.name ?? '未分配部门'}
        {!member.is_active ? ' · 已停用' : ''}
      </p>
    </div>
    {canManageMembers ? (
      <button
        type="button"
        disabled={!canManageMembers || isMutating}
        onClick={(event) => {
          event.stopPropagation();
          void onRemoveMember(member);
        }}
        aria-label={`移除 ${member.username}`}
        className="pointer-events-none absolute right-0 top-0 z-10 flex h-4.5 w-4.5 translate-x-[26%] -translate-y-[26%] items-center justify-center rounded-full border border-border/70 bg-white p-0 text-text-muted opacity-0 shadow-[0_1px_4px_rgba(15,23,42,0.08)] transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:border-destructive/25 hover:text-destructive focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none disabled:opacity-40"
      >
        {mutatingUserId === member.id ? (
          <Loader2 className="h-2 w-2 animate-spin" />
        ) : (
          <X className="h-2.5 w-2.5" strokeWidth={2.4} />
        )}
      </button>
    ) : null}
  </div>
);

export const RoleTemplateMemberPanel: React.FC<RoleTemplateMemberPanelProps> = ({
  activeRole,
  search,
  onSearchChange,
  membersByRole,
  candidateUsers,
  isLoading,
  canManageMembers,
  isMutating,
  mutatingUserId,
  onAddMember,
  onRemoveMember,
  selectedMemberId,
  onSelectMember,
  canSelectMember = false,
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const filteredCandidateUsers = useMemo(() => {
    const keyword = addSearch.trim().toLowerCase();
    if (!keyword) {
      return candidateUsers;
    }
    return candidateUsers.filter((user) => (
      user.username.toLowerCase().includes(keyword)
      || user.employee_id.toLowerCase().includes(keyword)
    ));
  }, [addSearch, candidateUsers]);
  const activeMembers = membersByRole[activeRole] ?? [];

  return (
    <aside className="flex min-h-0 flex-col border-t border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,0.96))] xl:border-t-0 xl:border-l">
      <div className="border-b border-border/60 px-3.5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">角色成员</h3>
            <p className="mt-1 text-[11px] leading-5 text-text-muted">
              已按角色分组，当前聚焦 {ROLE_FULL_LABELS[activeRole] ?? activeRole}
            </p>
            {!canManageMembers ? (
              <p className="mt-1 text-[11px] leading-5 text-text-muted">当前账号仅可查看，不能调整成员。</p>
            ) : null}
          </div>

          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canManageMembers || isMutating}
                className="h-8 px-3 text-[12px]"
              >
                <Plus className="h-3.5 w-3.5" />
                添加
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="w-[320px] rounded-xl border border-slate-200/90 bg-white/98 p-0 shadow-[0_18px_44px_rgba(15,23,42,0.16),0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5 backdrop-blur-sm"
            >
              <div className="border-b border-border/60 px-3 py-3">
                <p className="text-sm font-semibold text-foreground">
                  添加到{ROLE_FULL_LABELS[activeRole] ?? activeRole}
                </p>
                <SearchInput
                  value={addSearch}
                  onChange={setAddSearch}
                  placeholder="搜索姓名、工号"
                  className="mt-3"
                  inputClassName="h-9 rounded-lg text-[12px]"
                />
              </div>

              <ScrollContainer className="max-h-[320px] overflow-y-auto overflow-x-hidden px-2 py-2">
                {filteredCandidateUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
                    <UserPlus className="h-4 w-4 text-slate-300" />
                    <p className="text-[12px] text-text-muted">没有可添加的用户</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredCandidateUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        disabled={isMutating}
                        onClick={() => {
                          void onAddMember(user);
                          setAddOpen(false);
                          setAddSearch('');
                        }}
                        className="flex min-h-[66px] w-full items-center gap-2 rounded-xl border border-border/70 bg-white px-2 py-2 text-left transition-colors duration-200 hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <UserAvatar
                          avatarKey={user.avatar_key}
                          name={user.username}
                          size="sm"
                          className="h-6.5 w-6.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium leading-5 text-foreground">
                            {user.username}
                          </p>
                          <p className="truncate text-[10.5px] leading-4 text-text-muted">
                            {user.department?.name ?? '未分配部门'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollContainer>
            </PopoverContent>
          </Popover>
        </div>

        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={`搜索${ROLE_FULL_LABELS[activeRole] ?? activeRole}成员`}
          className="mt-3"
          inputClassName="h-9 rounded-lg text-[12px]"
        />
      </div>

      <ScrollContainer className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载成员中...
          </div>
        ) : (
          <div className="space-y-4">
            {ASSIGNABLE_ROLES.map((roleCode) => {
              const isActiveSection = roleCode === activeRole;
              const members = membersByRole[roleCode] ?? [];
              const previewMembers = isActiveSection ? members : members.slice(0, 4);

              return (
                <section
                  key={roleCode}
                  className={cn(
                    'rounded-2xl border px-3 py-3 transition-colors',
                    isActiveSection
                      ? 'border-primary/25 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]'
                      : 'border-border/60 bg-slate-50/55',
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className={cn(
                        'text-sm font-semibold',
                        isActiveSection ? 'text-foreground' : 'text-slate-500',
                      )}
                      >
                        {ROLE_FULL_LABELS[roleCode] ?? roleCode}
                      </h4>
                      <p className="mt-1 text-[11px] leading-5 text-text-muted">
                        {members.length} 人
                        {!isActiveSection && members.length > 4 ? ` · 仅展示前 4 人` : ''}
                      </p>
                    </div>
                    {isActiveSection ? (
                      <span className="rounded-full bg-primary/[0.08] px-2.5 py-1 text-[11px] font-medium text-primary">
                        当前
                      </span>
                    ) : null}
                  </div>

                  {previewMembers.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 px-3 py-5 text-[12px] text-text-muted">
                      <Search className="h-4 w-4 text-slate-300" />
                      当前没有成员
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {previewMembers.map((member) => renderMemberCard({
                        member,
                        selectedMemberId,
                        canSelectMember: isActiveSection && canSelectMember,
                        canManageMembers: isActiveSection && canManageMembers,
                        isMutating,
                        mutatingUserId,
                        onSelectMember,
                        onRemoveMember,
                        muted: !isActiveSection,
                      }))}
                    </div>
                  )}
                </section>
              );
            })}

            {activeMembers.length === 0 && search.trim() ? (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-4 text-center text-[12px] text-text-muted">
                当前筛选下没有匹配的{ROLE_FULL_LABELS[activeRole] ?? activeRole}成员。
              </div>
            ) : null}
          </div>
        )}
      </ScrollContainer>
    </aside>
  );
};
