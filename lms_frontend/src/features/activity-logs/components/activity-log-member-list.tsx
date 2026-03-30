import { Check, Users } from 'lucide-react';
import { UserAvatar } from '@/components/common/user-avatar';
import { cn } from '@/lib/utils';
import type { ActivityLogMember, ActivityLogType } from '../types';

interface ActivityLogMemberListProps {
  members: ActivityLogMember[];
  selectedMemberIds: number[];
  activeType: ActivityLogType;
  onToggleMember: (memberId: number) => void;
}

const TYPE_LABELS: Record<ActivityLogType, string> = {
  user: '账号',
  content: '内容',
  operation: '行为记录',
};

export const ActivityLogMemberList: React.FC<ActivityLogMemberListProps> = ({
  members,
  selectedMemberIds,
  activeType,
  onToggleMember,
}) => {
  return (
    <aside className="overflow-hidden rounded-2xl border border-border/60 bg-background">
      {/* 头部 */}
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] font-semibold text-foreground">成员</span>
          <span className="text-[12px] text-text-muted">({members.length})</span>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="scrollbar-subtle max-h-[38rem] overflow-y-auto p-2">
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[13px] text-text-muted">
            当前"{TYPE_LABELS[activeType]}"下没有成员记录
          </div>
        ) : (
          <div className="space-y-0.5">
            {members.map((member) => {
              const checked = selectedMemberIds.includes(member.user.id);
              return (
                <button
                  key={member.user.id}
                  type="button"
                  onClick={() => onToggleMember(member.user.id)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                    checked
                      ? 'bg-primary-50/70'
                      : 'hover:bg-muted'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors',
                      checked
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-background group-hover:border-primary/40'
                    )}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </div>

                  {/* Avatar */}
                  <UserAvatar
                    avatarKey={member.user.avatar_key}
                    name={member.user.username}
                    size="md"
                    className="h-9 w-9 shrink-0"
                  />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                      {member.user.username}
                    </p>
                    <p className="truncate text-[11px] leading-tight text-text-muted">
                      {member.user.employee_id}
                    </p>
                  </div>

                  {/* Count */}
                  <span className="shrink-0 text-[14px] font-semibold tabular-nums text-text-muted">
                    {member.activity_count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
