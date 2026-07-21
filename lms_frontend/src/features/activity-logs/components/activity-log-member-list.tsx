import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';

import { UserSelectableList } from '@/components/common/user-selectable-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SearchInput } from '@/components/ui/search-input';
import type {
  ActivityLogActor,
  ActivityLogMember,
  ActivityLogType,
} from '@/features/activity-logs/types';

interface ActivityLogMemberListProps {
  members: ActivityLogMember[];
  activeMemberId: number | null;
  checkedMemberIds: number[];
  activeType: ActivityLogType;
  onActivateMember: (memberId: number | null) => void;
  onToggleMemberCheck: (memberId: number) => void;
}

const TYPE_LABELS: Record<ActivityLogType, string> = {
  user: '账号',
  content: '内容',
  operation: '行为记录',
};

type ActivityLogDepartmentFilter = 'all' | 'room1' | 'room2';

const resolveDepartmentLabel = (user: ActivityLogActor) =>
  user.department_code === 'DEPT1'
    ? '一室'
    : user.department_code === 'DEPT2'
      ? '二室'
      : (user.department_name ?? '未分组');

const matchesDepartmentFilter = (
  user: ActivityLogActor,
  filter: ActivityLogDepartmentFilter,
) => {
  if (filter === 'all') {
    return true;
  }

  const departmentCode = user.department_code?.trim().toUpperCase() ?? '';
  if (filter === 'room1') {
    return departmentCode === 'DEPT1';
  }
  return departmentCode === 'DEPT2';
};

const matchesSearch = (user: ActivityLogActor, keyword: string) => {
  if (!keyword) {
    return true;
  }

  const searchText = [
    user.username,
    user.employee_id,
    user.department_name,
    user.department_code,
    resolveDepartmentLabel(user),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchText.includes(keyword);
};

export const ActivityLogMemberList: React.FC<ActivityLogMemberListProps> = ({
  members,
  activeMemberId,
  checkedMemberIds,
  activeType,
  onActivateMember,
  onToggleMemberCheck,
}) => {
  const [departmentFilter, setDepartmentFilter] =
    useState<ActivityLogDepartmentFilter>('all');
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();

  const filteredMembers = useMemo(
    () =>
      members.filter(
        ({ user }) =>
          matchesDepartmentFilter(user, departmentFilter) &&
          matchesSearch(user, normalizedSearch),
      ),
    [departmentFilter, members, normalizedSearch],
  );

  const panelItems = filteredMembers.map(({ user, activity_count }) => {
    return {
      id: user.id,
      name: user.username,
      employeeId: user.employee_id,
      avatarKey: user.avatar_key,
      meta: `${user.employee_id} · ${resolveDepartmentLabel(user)}`,
      indicators: [
        { value: activity_count, label: '日志', tone: 'neutral' as const },
      ],
    };
  });

  const resolvedEmptyText =
    members.length === 0
      ? `当前"${TYPE_LABELS[activeType]}"下没有成员记录`
      : normalizedSearch
        ? '没有匹配的成员'
        : departmentFilter === 'all'
          ? '暂无可筛选成员'
          : '当前分组下没有成员';

  return (
    <aside className="border-border/60 bg-background flex h-full min-h-[38rem] flex-col overflow-hidden rounded-xl border xl:max-h-full">
      <div className="border-border/60 flex h-11 shrink-0 items-center border-b px-5">
        <div className="flex items-center gap-2">
          <Users className="text-text-muted h-4 w-4" />
          <span className="text-foreground text-[13px] font-semibold">
            成员
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-3 pb-3">
        <SegmentedControl
          options={[
            { label: '全部', value: 'all' },
            { label: '一室', value: 'room1' },
            { label: '二室', value: 'room2' },
          ]}
          value={departmentFilter}
          onChange={(value) =>
            setDepartmentFilter(value as ActivityLogDepartmentFilter)
          }
          size="sm"
          className="w-full [&_button]:px-0 [&>div]:grid [&>div]:h-10 [&>div]:w-full [&>div]:grid-cols-3"
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="检索姓名、工号"
          className="w-full"
        />
      </div>

      <UserSelectableList
        mode="inspect"
        items={panelItems}
        activeId={activeMemberId}
        checkedIds={checkedMemberIds}
        onActivate={onActivateMember}
        onToggleCheck={onToggleMemberCheck}
        emptyText={resolvedEmptyText}
      />
    </aside>
  );
};
