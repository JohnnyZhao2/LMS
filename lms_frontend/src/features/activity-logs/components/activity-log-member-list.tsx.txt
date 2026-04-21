import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';

import { UserSelectList } from '@/components/common/user-select-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SearchInput } from '@/components/ui/search-input';
import type { ActivityLogActor, ActivityLogMember, ActivityLogType } from '../types';

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

type ActivityLogDepartmentFilter = 'all' | 'room1' | 'room2';

const resolveDepartmentLabel = (user: ActivityLogActor) => (
  user.department_code === 'DEPT1'
    ? '一室'
    : user.department_code === 'DEPT2'
      ? '二室'
      : (user.department_name ?? '未分组')
);

const matchesDepartmentFilter = (user: ActivityLogActor, filter: ActivityLogDepartmentFilter) => {
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
  selectedMemberIds,
  activeType,
  onToggleMember,
}) => {
  const [departmentFilter, setDepartmentFilter] = useState<ActivityLogDepartmentFilter>('all');
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();

  const filteredMembers = useMemo(
    () => members.filter(({ user }) => (
      matchesDepartmentFilter(user, departmentFilter) && matchesSearch(user, normalizedSearch)
    )),
    [departmentFilter, members, normalizedSearch],
  );

  const panelItems = filteredMembers.map(({ user, activity_count }) => {
    return {
      id: user.id,
      name: user.username,
      employeeId: user.employee_id,
      avatarKey: user.avatar_key,
      meta: `${user.employee_id} · ${resolveDepartmentLabel(user)}`,
      count: activity_count,
    };
  });

  const resolvedEmptyText = members.length === 0
    ? `当前"${TYPE_LABELS[activeType]}"下没有成员记录`
    : normalizedSearch
      ? '没有匹配的成员'
      : departmentFilter === 'all'
        ? '暂无可筛选成员'
        : '当前分组下没有成员';

  return (
    <aside className="flex h-full min-h-[38rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-background xl:max-h-full">
      <div className="border-b border-border/60 px-5">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-muted" />
            <span className="text-[13px] font-semibold text-foreground">成员</span>
            <span className="text-[12px] text-text-muted">({panelItems.length})</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-3 pt-3">
        <SegmentedControl
          options={[
            { label: '全部', value: 'all' },
            { label: '一室', value: 'room1' },
            { label: '二室', value: 'room2' },
          ]}
          value={departmentFilter}
          onChange={(value) => setDepartmentFilter(value as ActivityLogDepartmentFilter)}
          size="sm"
          className="w-full [&>div]:grid [&>div]:h-10 [&>div]:w-full [&>div]:grid-cols-3 [&_button]:px-0"
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="检索姓名、工号"
          className="w-full"
        />
      </div>

      <UserSelectList
        items={panelItems}
        selectedIds={selectedMemberIds}
        onSelect={onToggleMember}
        selectionMode="multiple"
        appearance="panel"
        emptyText={resolvedEmptyText}
        className="max-h-none"
      />
    </aside>
  );
};
