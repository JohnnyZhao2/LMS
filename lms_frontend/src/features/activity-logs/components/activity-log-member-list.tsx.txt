import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';

import { UserSelectList } from '@/components/common/user-select-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { ActivityLogType, ActivityLogUser } from '../types';

interface ActivityLogMemberListProps {
  users: ActivityLogUser[];
  memberActivityCountMap: Record<number, number>;
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

const matchesDepartmentFilter = (user: ActivityLogUser, filter: ActivityLogDepartmentFilter) => {
  if (filter === 'all') {
    return true;
  }

  const departmentCode = user.department_code?.trim().toUpperCase() ?? '';
  if (filter === 'room1') {
    return departmentCode === 'DEPT1';
  }
  return departmentCode === 'DEPT2';
};

export const ActivityLogMemberList: React.FC<ActivityLogMemberListProps> = ({
  users,
  memberActivityCountMap,
  selectedMemberIds,
  activeType,
  onToggleMember,
}) => {
  const [departmentFilter, setDepartmentFilter] = useState<ActivityLogDepartmentFilter>('all');

  const filteredMembers = useMemo(
    () => users.filter((user) => matchesDepartmentFilter(user, departmentFilter)),
    [departmentFilter, users],
  );

  const panelItems = filteredMembers.map((user) => {
    const activityCount = memberActivityCountMap[user.id] ?? 0;
    const isSelected = selectedMemberIds.includes(user.id);
    return {
      id: user.id,
      name: user.username,
      employeeId: user.employee_id,
      avatarKey: user.avatar_key,
      meta: `${user.employee_id} · ${
        user.department_code === 'DEPT1'
          ? '一室'
          : user.department_code === 'DEPT2'
            ? '二室'
            : (user.department_name ?? '未分组')
      }`,
      count: activityCount,
      disabled: activityCount === 0 && !isSelected,
    };
  });

  const resolvedEmptyText = filteredMembers.length === 0
    ? (departmentFilter === 'all'
      ? '暂无可筛选成员'
      : '当前分组下没有成员')
    : `当前"${TYPE_LABELS[activeType]}"下没有成员记录`;

  return (
    <aside className="flex h-full min-h-[38rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-background xl:max-h-full">
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] font-semibold text-foreground">成员</span>
          <span className="text-[12px] text-text-muted">({panelItems.length})</span>
        </div>
      </div>

      <div className="border-b border-border/60 px-3 py-2.5">
        <SegmentedControl
          options={[
            { label: '全部', value: 'all' },
            { label: '一室', value: 'room1' },
            { label: '二室', value: 'room2' },
          ]}
          value={departmentFilter}
          onChange={(value) => setDepartmentFilter(value as ActivityLogDepartmentFilter)}
          size="sm"
          className="w-full [&>div]:w-full [&>div]:grid [&>div]:grid-cols-3 [&_button]:px-0"
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
